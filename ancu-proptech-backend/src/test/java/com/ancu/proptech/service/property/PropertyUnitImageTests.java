package com.ancu.proptech.service.property;

import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PropertyUnitImageTests {
    private final PropertyImageRepository images=mock(PropertyImageRepository.class);
    private final PropertyRepository properties=mock(PropertyRepository.class);
    private final ApartmentRepository apartments=mock(ApartmentRepository.class);
    private final PropertyApplicantAccess applicants=mock(PropertyApplicantAccess.class);
    private final AccountAccessService access=mock(AccountAccessService.class);
    private final PropertyImageService service=new PropertyImageService(images,properties,apartments,applicants,access);
    private final Property property=new Property();
    @BeforeEach void setup(){var owner=new AuthAccount();owner.setId(1L);owner.setStatus(AuthAccount.Status.ACTIVE);property.setId(2L);property.setOwner(owner);property.setApprovalStatus(Property.ApprovalStatus.APPROVED);}
    private PropertyImage image(Long id,Long unit){var image=new PropertyImage();image.setId(id);image.setUploaderId(1L);image.setPropertyId(2L);image.setApartmentId(unit);image.setContent(new byte[]{1});image.setContentType("image/png");return image;}
    @Test void hiddenUnitPhotoCannotBeReadBecauseAnotherUnitIsPublished(){
        var photo=image(7L,3L);when(images.findById(7L)).thenReturn(Optional.of(photo));
        var apartment=new Apartment();apartment.setId(3L);apartment.setProperty(property);apartment.setPublicationStatus(Apartment.PublicationStatus.HIDDEN);
        when(apartments.findById(3L)).thenReturn(Optional.of(apartment));
        assertEquals("RESOURCE_NOT_FOUND",assertThrows(ApiException.class,()->service.download(null,7L)).code);
    }
    @Test void publishedUnitPhotoIsPublicOnlyWithApprovedActiveProperty(){
        var photo=image(7L,3L);when(images.findById(7L)).thenReturn(Optional.of(photo));
        var apartment=new Apartment();apartment.setId(3L);apartment.setProperty(property);apartment.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);
        when(apartments.findById(3L)).thenReturn(Optional.of(apartment));
        when(apartments.existsByPropertyIdAndPublicationStatus(2L,Apartment.PublicationStatus.PUBLISHED)).thenReturn(true);
        when(properties.findById(2L)).thenReturn(Optional.of(property));
        assertArrayEquals(new byte[]{1},service.download(null,7L).content());
        property.setApprovalStatus(Property.ApprovalStatus.DRAFT);
        assertThrows(ApiException.class,()->service.download(null,7L));
    }
    @Test void replacingUnitGalleryRejectsOtherRoomAndCommonImages(){
        for(Long otherUnit:Arrays.asList(9L,null)){
            when(images.findForBinding(7L)).thenReturn(Optional.of(image(7L,otherUnit)));
            assertThrows(ApiException.class,()->service.replaceUnit(property,3L,List.of(7L)));
        }
        verify(images,never()).deleteAll(any());
    }
    @Test void replacingUnitGalleryKeepsCommonGallerySeparate(){
        var retained=image(7L,3L);var removed=image(8L,3L);
        when(images.findForBinding(7L)).thenReturn(Optional.of(retained));
        when(images.findByApartmentIdOrderByPositionAsc(3L)).thenReturn(List.of(retained,removed));
        service.replaceUnit(property,3L,List.of(7L));
        verify(images).deleteAll(List.of(removed));
        verify(images,never()).findByPropertyIdAndApartmentIdIsNullOrderByPositionAsc(any());
    }
    @Test void legacyPrivateCoverPrecedesSharedPropertyImages(){
        when(images.unitIds(3L)).thenReturn(List.of());when(images.ids(2L)).thenReturn(List.of(8L));
        assertEquals(List.of("/images/legacy-room.jpg","/api/v1/property-images/8"),service.unitUrls(2L,3L,"/images/legacy-room.jpg"));
        when(images.unitIds(3L)).thenReturn(List.of(7L));
        assertEquals(List.of("/api/v1/property-images/7","/api/v1/property-images/8"),service.unitUrls(2L,3L,"/images/legacy-room.jpg"));
    }
}
