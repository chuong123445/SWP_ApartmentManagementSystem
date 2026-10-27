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
    private final com.ancu.proptech.repository.property.PropertyExternalImportRepository imports;
    private final PropertyApplicantAccess applicantAccess;
    private final PropertyImageService images;
    @Transactional public OwnerPropertyCreated createApplication(Jwt jwt,PropertyApplicationCreate input){
        if(input.getRightType()==com.ancu.proptech.model.property.PropertyDossier.RightType.OWNERSHIP)
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_RIGHT_TYPE","Hồ sơ nâng cấp thủ công dùng quyền ủy quyền hoặc cho thuê lại.");
        return createInternal(jwt,input,input.getRightType());
    }
    @Transactional(readOnly=true) public List<OwnerPropertyResponse> applications(Jwt jwt){
        var a=applicantAccess.verified(jwt);return properties.findByOwnerIdOrderByNameAscIdAsc(a.getId()).stream().filter(Property::isOnboardingApplication).map(this::response).toList();
    }
    @Transactional(readOnly = true)
    public List<OwnerPropertyResponse> list(Jwt jwt) {
        var owner = access.owner(jwt);
        return properties.findByOwnerIdOrderByNameAscIdAsc(owner.getId()).stream()
                .map(this::response).toList();
    }

    @Transactional
    public OwnerPropertyCreated create(Jwt jwt, OwnerPropertyCreate input) {
        return createInternal(jwt,input,null);
    }
    private OwnerPropertyCreated createInternal(Jwt jwt,OwnerPropertyCreate input,com.ancu.proptech.model.property.PropertyDossier.RightType applicationRight){
        var owner = applicationRight==null?access.owner(jwt):applicantAccess.verified(jwt);
        if (input.getRentalMode() == Property.RentalMode.SINGLE_UNIT && input.getApartments().size() != 1)
            throw new ApiException(HttpStatus.BAD_REQUEST, "SINGLE_UNIT_REQUIRED", "Tài sản cho thuê nguyên căn chỉ có một căn cho thuê.");
        var numbers = new HashSet<String>();
        for (var unit : input.getApartments()) {
            if (!numbers.add(unit.getRoomNumber().strip().toLowerCase(java.util.Locale.ROOT)))
                throw new ApiException(HttpStatus.BAD_REQUEST, "APARTMENT_NUMBER_EXISTS", "Mã căn/phòng bị trùng trong tài sản.");
        }
        var property = new Property();
        property.setOwner(owner); property.setName(input.getName().strip()); property.setAddress(input.getAddress().strip());
        property.setCity(input.getCity().strip()); property.setDistrict(input.getDistrict().strip());
        property.setWard(input.getWard() == null || input.getWard().isBlank() ? null : input.getWard().strip());
        property.setRentalMode(input.getRentalMode()); property.setApprovalStatus(Property.ApprovalStatus.DRAFT);
        property.setOnboardingApplication(applicationRight!=null);property.setRightType(applicationRight);
        properties.saveAndFlush(property);
        images.bind(property,input.getImageIds());
        var created = input.getApartments().stream().map(unit -> {
            var apartment = new OwnerApartmentCreate();
            apartment.setPropertyId(property.getId()); apartment.setRoomNumber(unit.getRoomNumber()); apartment.setTitle(unit.getTitle());
            apartment.setDescription(unit.getDescription()); apartment.setFloor(unit.getFloor()); apartment.setAreaM2(unit.getAreaM2());
            apartment.setAdvertisedMonthlyRent(unit.getAdvertisedMonthlyRent()); apartment.setDeposit(unit.getDeposit());
            apartment.setBedrooms(unit.getBedrooms()); apartment.setBathrooms(unit.getBathrooms()); apartment.setMaxOccupants(unit.getMaxOccupants());
            apartment.setElectricityIndex(unit.getElectricityIndex()); apartment.setWaterIndex(unit.getWaterIndex());
            apartment.setElectricityUnitPrice(unit.getElectricityUnitPrice());apartment.setWaterUnitPrice(unit.getWaterUnitPrice());
            apartment.setAmenities(unit.getAmenities()); apartment.setPublicationStatus(Apartment.PublicationStatus.DRAFT);
            return applicationRight==null?apartments.create(jwt, apartment):apartments.createApplication(jwt,apartment);
        }).toList();
        return new OwnerPropertyCreated(response(property), created);
    }

    private OwnerPropertyResponse response(Property p) {
        return new OwnerPropertyResponse(p.getId(), p.getName(), p.getAddress(), p.getApprovalStatus().name(),
                p.getRentalMode() == null ? null : p.getRentalMode().name(), p.getCity(), p.getDistrict(), p.getWard(), p.getVersion(),imports.findById(p.getId()).map(com.ancu.proptech.model.property.PropertyExternalImport::getSource).orElse(null),p.isOnboardingApplication(),p.getRightType()==null?null:p.getRightType().name(),p.getRightsValidFrom(),p.getRightsValidUntil());
    }
}
