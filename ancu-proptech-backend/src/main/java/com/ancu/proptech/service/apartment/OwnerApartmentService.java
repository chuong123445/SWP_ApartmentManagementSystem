package com.ancu.proptech.service.apartment;
import com.ancu.proptech.dto.apartment.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.*;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.apartment.*;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class OwnerApartmentService {
    private final ApartmentRepository apartments;
    private final ApartmentPendingEditRepository pendingEdits;
    private final PropertyRepository properties;
    private final AccountAccessService access;

    @Transactional(readOnly = true)
    public List<OwnerApartmentResponse> list(Jwt jwt) {
        var owner = access.owner(jwt);
        return apartments.findByPropertyOwnerIdOrderByCreatedAtAscIdAsc(owner.getId()).stream().map(this::response).toList();
    }

    @Transactional
    public OwnerApartmentResponse create(Jwt jwt, OwnerApartmentCreate input) {
        var owner = access.owner(jwt);
        var property = properties.findOwnedForCreation(input.getPropertyId(), owner.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy tài sản thuộc tài khoản của bạn."));
        if (input.getPublicationStatus() == Apartment.PublicationStatus.PUBLISHED && property.getApprovalStatus() != Property.ApprovalStatus.APPROVED)
            throw new ApiException(HttpStatus.CONFLICT, "PROPERTY_NOT_APPROVED", "Tài sản phải được duyệt trước khi đăng căn hộ công khai.");
        String number = input.getRoomNumber().strip();
        if (property.getRentalMode() == Property.RentalMode.SINGLE_UNIT && apartments.countByPropertyId(property.getId()) > 0)
            throw new ApiException(HttpStatus.CONFLICT, "SINGLE_UNIT_LIMIT", "Tài sản cho thuê nguyên căn đã có một căn cho thuê.");
        if (apartments.existsByPropertyIdAndRoomNumber(property.getId(), number))
            throw new ApiException(HttpStatus.CONFLICT, "APARTMENT_NUMBER_EXISTS", "Mã căn hộ đã tồn tại trong tài sản này.");
        Apartment a = new Apartment();
        a.setProperty(property); a.setRoomNumber(number); a.setTitle(input.getTitle().strip());
        a.setDescription(input.getDescription().strip()); a.setFloor(input.getFloor()); a.setAreaM2(input.getAreaM2());
        a.setAdvertisedMonthlyRent(input.getAdvertisedMonthlyRent()); a.setDeposit(input.getDeposit());
        a.setElectricityIndex(input.getElectricityIndex()); a.setWaterIndex(input.getWaterIndex());
        a.setMaxOccupants(input.getMaxOccupants()); a.setBedrooms(input.getBedrooms()); a.setBathrooms(input.getBathrooms());
        a.setAmenities(new ArrayList<>(input.getAmenities())); a.setPublicationStatus(input.getPublicationStatus());
        a.setAvailability(Apartment.Availability.VACANT); a.setCreatedAt(Instant.now());
        a.setEditApprovalStatus(Apartment.EditApprovalStatus.NONE);
        a.setCoverImagePath("/images/apartment-placeholder.svg");
        return response(apartments.save(a));
    }

    @Transactional
    public OwnerApartmentResponse publication(Jwt jwt, UUID id, ApartmentPublication input) {
        var owner = access.owner(jwt);
        var propertyId = apartments.findPropertyId(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy căn hộ."));
        var property = properties.findById(propertyId).filter(p -> p.getOwner().getId().equals(owner.getId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy căn hộ."));
        var apartment = apartments.findForOwnerUpdate(id,owner.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy căn hộ."));
        if (apartment.getVersion() != input.getVersion()) throw new ApiException(HttpStatus.CONFLICT,"STALE_VERSION","Căn hộ đã thay đổi. Hãy tải lại.");
        if (input.getPublicationStatus() == Apartment.PublicationStatus.PUBLISHED && property.getApprovalStatus() != Property.ApprovalStatus.APPROVED)
            throw new ApiException(HttpStatus.CONFLICT,"PROPERTY_NOT_APPROVED","Tài sản phải được Admin duyệt trước khi công khai căn hộ.");
        apartment.setPublicationStatus(input.getPublicationStatus()); apartments.flush(); return response(apartment);
    }

    /**
     * Updates basic (non-sensitive) fields immediately regardless of property approval status.
     * Basic fields: title, description, floor, maxOccupants, bedrooms, bathrooms, amenities.
     */
    @Transactional
    public OwnerApartmentResponse updateBasic(Jwt jwt, UUID id, ApartmentBasicUpdate input) {
        var owner = access.owner(jwt);
        var apartment = apartments.findForOwnerUpdate(id, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy căn hộ."));
        if (apartment.getVersion() != input.getVersion())
            throw new ApiException(HttpStatus.CONFLICT, "STALE_VERSION", "Căn hộ đã thay đổi. Hãy tải lại.");

        apartment.setTitle(input.getTitle().strip());
        apartment.setDescription(input.getDescription().strip());
        apartment.setFloor(input.getFloor());
        apartment.setMaxOccupants(input.getMaxOccupants());
        apartment.setBedrooms(input.getBedrooms());
        apartment.setBathrooms(input.getBathrooms());
        apartment.setAmenities(new ArrayList<>(input.getAmenities()));
        apartments.flush();
        return response(apartment);
    }

    /**
     * Updates sensitive fields (rent, deposit, electricity/water index, area).
     * - Property NOT APPROVED  → applies changes directly to the apartment.
     * - Property IS APPROVED   → stores changes as a pending edit draft and sets
     *                            editApprovalStatus = PENDING until admin acts.
     *                            If a previous pending draft exists it is overwritten.
     */
    @Transactional
    public OwnerApartmentResponse updateSensitive(Jwt jwt, UUID id, ApartmentSensitiveUpdate input) {
        var owner = access.owner(jwt);
        var apartment = apartments.findForOwnerUpdate(id, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy căn hộ."));
        if (apartment.getVersion() != input.getVersion())
            throw new ApiException(HttpStatus.CONFLICT, "STALE_VERSION", "Căn hộ đã thay đổi. Hãy tải lại.");

        boolean needsApproval = apartment.getProperty().getApprovalStatus() == Property.ApprovalStatus.APPROVED;

        if (!needsApproval) {
            // Property not yet APPROVED → apply directly
            apartment.setAreaM2(input.getAreaM2());
            apartment.setAdvertisedMonthlyRent(input.getAdvertisedMonthlyRent());
            apartment.setDeposit(input.getDeposit());
            apartment.setElectricityIndex(input.getElectricityIndex());
            apartment.setWaterIndex(input.getWaterIndex());
        } else {
            // Property APPROVED → create/override pending draft
            ApartmentPendingEdit draft = pendingEdits.findById(id).orElseGet(() -> {
                var e = new ApartmentPendingEdit();
                e.setApartment(apartment);
                return e;
            });
            draft.setAdvertisedMonthlyRent(input.getAdvertisedMonthlyRent());
            draft.setDeposit(input.getDeposit());
            draft.setElectricityIndex(input.getElectricityIndex());
            draft.setWaterIndex(input.getWaterIndex());
            draft.setAreaM2(input.getAreaM2());
            draft.setRequestedAt(Instant.now());
            draft.setRequestedByOwner(owner);
            pendingEdits.save(draft);
            apartment.setEditApprovalStatus(Apartment.EditApprovalStatus.PENDING);
        }
        apartments.flush();
        return response(apartment);
    }

    // ---------------------------------------------------------------------------
    // Admin helpers (called by AdminApartmentEditService)
    // ---------------------------------------------------------------------------

    /** Applies the pending draft to the apartment and clears it. Admin only. */
    @Transactional
    public OwnerApartmentResponse applyPendingEdit(UUID id) {
        var apartment = apartments.findForAdminUpdate(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy căn hộ."));
        var draft = pendingEdits.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PENDING_EDIT_NOT_FOUND", "Không tìm thấy bản chỉnh sửa đang chờ duyệt."));
        apartment.setAreaM2(draft.getAreaM2());
        apartment.setAdvertisedMonthlyRent(draft.getAdvertisedMonthlyRent());
        apartment.setDeposit(draft.getDeposit());
        apartment.setElectricityIndex(draft.getElectricityIndex());
        apartment.setWaterIndex(draft.getWaterIndex());
        apartment.setEditApprovalStatus(Apartment.EditApprovalStatus.NONE);
        pendingEdits.delete(draft);
        apartments.flush();
        return response(apartment);
    }

    /** Rejects and discards the pending draft. Admin only. */
    @Transactional
    public OwnerApartmentResponse rejectPendingEdit(UUID id) {
        var apartment = apartments.findForAdminUpdate(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy căn hộ."));
        pendingEdits.deleteById(id);
        apartment.setEditApprovalStatus(Apartment.EditApprovalStatus.NONE);
        apartments.flush();
        return response(apartment);
    }

    /** Lists all apartments with pending edits awaiting admin review. Admin only. */
    @Transactional(readOnly = true)
    public List<OwnerApartmentResponse> listPendingEdits() {
        return apartments.findByEditApprovalStatus(Apartment.EditApprovalStatus.PENDING).stream()
                .map(this::response).toList();
    }

    // ---------------------------------------------------------------------------
    // Shared response mapper
    // ---------------------------------------------------------------------------

    public OwnerApartmentResponse response(Apartment a) {
        var p = a.getProperty();
        ApartmentPendingEditResponse pending = null;
        if (a.getEditApprovalStatus() == Apartment.EditApprovalStatus.PENDING) {
            var draft = pendingEdits.findById(a.getId()).orElse(null);
            if (draft != null) {
                pending = new ApartmentPendingEditResponse(
                        draft.getAdvertisedMonthlyRent() == null ? null : draft.getAdvertisedMonthlyRent().toPlainString(),
                        draft.getDeposit() == null ? null : draft.getDeposit().toPlainString(),
                        draft.getElectricityIndex(),
                        draft.getWaterIndex(),
                        draft.getAreaM2() == null ? null : draft.getAreaM2().toPlainString(),
                        draft.getRequestedAt());
            }
        }
        return new OwnerApartmentResponse(
                a.getId(), p.getId(), p.getName(), p.getOwner().getId(),
                a.getRoomNumber() == null ? a.getTitle() : a.getRoomNumber(),
                a.getTitle(), a.getDescription(), a.getFloor(),
                a.getAreaM2().toPlainString(), a.getAdvertisedMonthlyRent().toPlainString(),
                a.getDeposit() == null ? null : a.getDeposit().toPlainString(),
                a.getElectricityIndex(), a.getWaterIndex(), a.getMaxOccupants(),
                a.getBedrooms(), a.getBathrooms(), List.copyOf(a.getAmenities()),
                a.getPublicationStatus().name(), a.getAvailability().name(),
                p.getApprovalStatus().name(),
                a.getCoverImagePath() == null || a.getCoverImagePath().isBlank()
                        ? "/images/apartment-placeholder.svg" : a.getCoverImagePath(),
                a.getEditApprovalStatus().name(), pending,
                a.getVersion());
    }
}
