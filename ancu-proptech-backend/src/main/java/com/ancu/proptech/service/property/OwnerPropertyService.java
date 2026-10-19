package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.dto.apartment.OwnerApartmentCreate;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.service.apartment.OwnerApartmentService;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.HashSet;
import org.springframework.http.HttpStatus;
@Service @RequiredArgsConstructor
public class OwnerPropertyService {
    private final PropertyRepository properties;
    private final AccountAccessService access;
    private final OwnerApartmentService apartments;
    @Transactional(readOnly = true)
    public List<OwnerPropertyResponse> list(Jwt jwt) {
        var owner = access.owner(jwt);
        return properties.findByOwnerIdOrderByNameAscIdAsc(owner.getId()).stream()
                .map(this::response).toList();
    }

    @Transactional
    public OwnerPropertyCreated create(Jwt jwt, OwnerPropertyCreate input) {
        var owner = access.owner(jwt);
        if (input.getRentalMode() == Property.RentalMode.SINGLE_UNIT && input.getApartments().size() != 1)
            throw new ApiException(HttpStatus.BAD_REQUEST, "SINGLE_UNIT_REQUIRED", "Tài sản cho thuê nguyên căn chỉ có một căn cho thuê.");
        var numbers = new HashSet<String>();
        for (var unit : input.getApartments()) {
            if (!numbers.add(unit.getRoomNumber().strip().toLowerCase(java.util.Locale.ROOT)))
                throw new ApiException(HttpStatus.BAD_REQUEST, "APARTMENT_NUMBER_EXISTS", "Mã căn/phòng bị trùng trong tài sản.");
        }
        var property = new Property();
        property.setOwner(owner); property.setName(input.getName().strip()); property.setAddress(input.getAddress().strip());
        property.setCity(input.getCity().strip()); property.setDistrict(input.getDistrict() == null ? "" : input.getDistrict().strip());
        property.setWard(input.getWard() == null || input.getWard().isBlank() ? null : input.getWard().strip());
        property.setRentalMode(input.getRentalMode()); property.setApprovalStatus(Property.ApprovalStatus.DRAFT);
        properties.saveAndFlush(property);
        var created = input.getApartments().stream().map(unit -> {
            var apartment = new OwnerApartmentCreate();
            apartment.setPropertyId(property.getId()); apartment.setRoomNumber(unit.getRoomNumber()); apartment.setTitle(unit.getTitle());
            apartment.setDescription(unit.getDescription()); apartment.setFloor(unit.getFloor()); apartment.setAreaM2(unit.getAreaM2());
            apartment.setAdvertisedMonthlyRent(unit.getAdvertisedMonthlyRent()); apartment.setDeposit(unit.getDeposit());
            apartment.setBedrooms(unit.getBedrooms()); apartment.setBathrooms(unit.getBathrooms()); apartment.setMaxOccupants(unit.getMaxOccupants());
            apartment.setElectricityIndex(unit.getElectricityIndex()); apartment.setWaterIndex(unit.getWaterIndex());
            apartment.setAmenities(unit.getAmenities()); apartment.setPublicationStatus(Apartment.PublicationStatus.DRAFT);
            return apartments.create(jwt, apartment);
        }).toList();
        return new OwnerPropertyCreated(response(property), created);
    }

    private OwnerPropertyResponse response(Property p) {
        return new OwnerPropertyResponse(p.getId(), p.getName(), p.getAddress(), p.getApprovalStatus().name(),
                p.getRentalMode() == null ? null : p.getRentalMode().name(), p.getCity(), p.getDistrict(), p.getWard(), p.getVersion());
    }
}
