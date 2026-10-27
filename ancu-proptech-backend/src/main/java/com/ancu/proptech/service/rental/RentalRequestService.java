package com.ancu.proptech.service.rental;

import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.rental.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.apartment.ApartmentService;
import com.ancu.proptech.service.auth.AccountVerificationPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class RentalRequestService {
    private final ApartmentRepository apartments;
    private final RentalRequestRepository requests;
    private final AccountAccessService access;
    private final AccountVerificationPolicy verification;

    @Transactional
    public RentalRequestResponse submit(Jwt jwt, UUID apartmentId, RentalRequestCreate input) {
        var customer = access.customer(jwt);
        Apartment apartment = apartments.findForRequest(apartmentId).orElseThrow(RentalRequestService::notFound);
        var p = apartment.getProperty();
        var owner = p.getOwner();
        if (owner.getId().equals(customer.getId()))
            throw new ApiException(HttpStatus.FORBIDDEN, "OWN_APARTMENT_RENTAL", "Bạn không thể gửi yêu cầu thuê căn hộ của chính mình.");
        if (!activeRequests(customer.getId(), apartmentId).isEmpty())
            throw new ApiException(HttpStatus.CONFLICT, "RENTAL_REQUEST_EXISTS", "Bạn đã có yêu cầu thuê cho căn hộ này. Hãy xem hoặc hủy yêu cầu đang chờ xử lý.");
        if (apartment.getPublicationStatus() != Apartment.PublicationStatus.PUBLISHED || p.getApprovalStatus() != Property.ApprovalStatus.APPROVED
                || owner.getStatus() != AuthAccount.Status.ACTIVE || !owner.isContactVerified() || owner.getRole() != AuthAccount.Role.OWNER) throw notFound();
        if (apartment.getAvailability() != Apartment.Availability.VACANT)
            throw new ApiException(HttpStatus.CONFLICT, "APARTMENT_NOT_AVAILABLE", "Căn hộ hiện không còn nhận yêu cầu thuê.");
        RentalRequest request = new RentalRequest();
        request.setApartment(apartment);
        request.setCustomer(customer);
        request.setMessage(input.getMessage() == null ? "" : input.getMessage().strip());
        request.setCreatedAt(Instant.now());
        request.setStatus(RentalRequest.Status.PENDING);
        return response(requests.save(request)); // Submission never changes apartment availability.
    }

    @Transactional(readOnly = true)
    public java.util.List<RentalRequestResponse> forApartment(Jwt jwt, UUID apartmentId) {
        return activeRequests(access.customer(jwt).getId(), apartmentId).stream().map(this::response).toList();
    }

    private java.util.List<RentalRequest> activeRequests(UUID customerId, UUID apartmentId) {
        return requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(customerId, apartmentId,
                java.util.List.of(RentalRequest.Status.PENDING, RentalRequest.Status.ACCEPTED));
    }

    @Transactional
    public RentalRequestResponse cancel(Jwt jwt, UUID id, RentalRequestCancel input) {
        var customer = access.customer(jwt);
        var request = requests.findOwnForUpdate(id, customer.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy yêu cầu thuê."));
        if (request.getVersion() != input.getVersion())
            throw new ApiException(HttpStatus.CONFLICT, "STALE_VERSION", "Yêu cầu đã thay đổi. Vui lòng tải lại trước khi hủy.");
        if (request.getStatus() != RentalRequest.Status.PENDING)
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_NOT_PENDING", "Chỉ có thể hủy yêu cầu đang chờ chủ nhà xử lý.");
        request.setStatus(RentalRequest.Status.CANCELLED);
        return response(requests.saveAndFlush(request));
    }

    @Transactional(readOnly = true)
    public PageResponse<RentalRequestResponse> mine(Jwt jwt, int page, int size) {
        ApartmentService.validatePage(page, size);
        var customer = access.customer(jwt);
        return PageResponse.from(requests.findByCustomerId(customer.getId(), PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"))).map(this::response));
    }

    @Transactional(readOnly = true)
    public PageResponse<RentalRequestResponse> ownerInbox(Jwt jwt, UUID apartmentId, RentalRequest.Status status, int page, int size) {
        return ownerInbox(jwt, apartmentId, status, page, size, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<RentalRequestResponse> ownerInbox(Jwt jwt, UUID apartmentId, RentalRequest.Status status, int page, int size, UUID propertyId) {
        ApartmentService.validatePage(page, size);
        var owner = access.owner(jwt);
        return PageResponse.from(requests.findOwnerInbox(owner.getId(), apartmentId, status, propertyId,
                PageRequest.of(page, size)).map(this::response));
    }

    @Transactional
    public RentalRequestResponse decide(Jwt jwt, UUID id, RentalDecision input) {
        var owner = access.owner(jwt);
        var request = requests.findForOwnerUpdate(id, owner.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy yêu cầu thuê."));
        if (request.getVersion() != input.getVersion())
            throw new ApiException(HttpStatus.CONFLICT, "STALE_VERSION", "Yêu cầu đã thay đổi. Vui lòng tải lại trước khi xử lý.");
        if (request.getStatus() != RentalRequest.Status.PENDING)
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_NOT_PENDING", "Chỉ có thể xử lý yêu cầu đang chờ xử lý.");

        if (input.getDecision() == RentalDecision.Decision.ACCEPT) {
            var customer = request.getCustomer();
            if (customer.getStatus() != AuthAccount.Status.ACTIVE || !verification.isVerified(customer))
                throw new ApiException(HttpStatus.CONFLICT, "CUSTOMER_NOT_ELIGIBLE", "Tài khoản người tìm thuê không còn hợp lệ.");
            Apartment apartment = apartments.findForRequest(request.getApartment().getId()).orElseThrow(RentalRequestService::notFound);
            if (apartment.getAvailability() != Apartment.Availability.VACANT)
                throw new ApiException(HttpStatus.CONFLICT, "APARTMENT_NOT_AVAILABLE", "Căn hộ hiện không còn ở trạng thái nhận xử lý yêu cầu hoặc đã có hợp đồng đang thực hiện.");
            apartment.setAvailability(Apartment.Availability.CONTRACT_IN_PROGRESS);
            apartments.save(apartment);
            request.setStatus(RentalRequest.Status.ACCEPTED);
        } else if (input.getDecision() == RentalDecision.Decision.REJECT) {
            request.setStatus(RentalRequest.Status.REJECTED);
        }
        request.setDecisionReason(input.getReason() == null || input.getReason().isBlank() ? null : input.getReason().strip());
        return response(requests.saveAndFlush(request));
    }

    private RentalRequestResponse response(RentalRequest r) {
        return new RentalRequestResponse(r.getId(), r.getApartment().getId(), r.getApartment().getTitle(), r.getApartment().getProperty().getAddress(),
                r.getApartment().getAdvertisedMonthlyRent().toPlainString(), r.getCustomer().getId(), r.getCustomer().getFullName(), r.getCustomer().getEmail(),
                r.getMessage(), r.getStatus().name(), r.getCreatedAt(), r.getVersion(), r.getDecisionReason());
    }
    private static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy căn hộ đang được đăng công khai."); }
}
