package com.ancu.proptech.service.apartment;
import com.ancu.proptech.dto.apartment.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
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
        a.setCoverImagePath("/images/apartment-placeholder.svg");
        return response(apartments.save(a));
    }
    private OwnerApartmentResponse response(Apartment a) {
        var p = a.getProperty();
        return new OwnerApartmentResponse(a.getId(), p.getId(), p.getName(), p.getOwner().getId(),
                a.getRoomNumber() == null ? a.getTitle() : a.getRoomNumber(), a.getTitle(), a.getDescription(), a.getFloor(),
                a.getAreaM2().toPlainString(), a.getAdvertisedMonthlyRent().toPlainString(), a.getDeposit() == null ? null : a.getDeposit().toPlainString(),
                a.getElectricityIndex(), a.getWaterIndex(), a.getMaxOccupants(), a.getBedrooms(), a.getBathrooms(), List.copyOf(a.getAmenities()),
                a.getPublicationStatus().name(), a.getAvailability().name(), p.getApprovalStatus().name(), a.getVersion());
    }
}
