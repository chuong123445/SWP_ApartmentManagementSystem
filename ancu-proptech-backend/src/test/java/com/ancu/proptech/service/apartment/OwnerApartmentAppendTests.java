package com.ancu.proptech.service.apartment;

import com.ancu.proptech.dto.apartment.OwnerApartmentCreate;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.property.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OwnerApartmentAppendTests {
    @Test void approvedManualPropertyRequiresOwnImagesAndBindsThemBeforeResponse(){
        var units=mock(ApartmentRepository.class);var properties=mock(PropertyRepository.class);var access=mock(AccountAccessService.class);
        var imports=mock(PropertyExternalImportRepository.class);var rights=mock(PropertyRightsPolicy.class);var images=mock(PropertyImageService.class);
        var service=new OwnerApartmentService(units,mock(AssetManagementAccess.class),properties,access,imports,mock(PropertyApplicantAccess.class),rights,mock(RentalRequestRepository.class),images);
        var owner=new AuthAccount();owner.setId(1L);when(access.owner(null)).thenReturn(owner);
        var property=new Property();property.setId(2L);property.setOwner(owner);property.setApprovalStatus(Property.ApprovalStatus.APPROVED);property.setRentalMode(Property.RentalMode.MULTI_UNIT);
        when(properties.findOwnedForCreation(2L,1L)).thenReturn(Optional.of(property));
        var input=new OwnerApartmentCreate();input.setPropertyId(2L);input.setRoomNumber("P.303");input.setTitle("New room");input.setFloor(3);input.setAreaM2(new BigDecimal("28"));input.setAdvertisedMonthlyRent(new BigDecimal("5000000"));
        assertEquals("UNIT_IMAGES_REQUIRED",assertThrows(ApiException.class,()->service.create(null,input)).code);verify(units,never()).saveAndFlush(any());
        input.setImageIds(List.of(7L));when(units.saveAndFlush(any())).thenAnswer(call->{var unit=(com.ancu.proptech.model.apartment.Apartment)call.getArgument(0);unit.setId(3L);return unit;});
        var result=service.create(null,input);assertEquals(3L,result.id());assertEquals("DRAFT",result.publicationStatus());
        verify(images).bindUnit(property,3L,List.of(7L));verify(rights,times(2)).requireCurrent(property);
    }
}
