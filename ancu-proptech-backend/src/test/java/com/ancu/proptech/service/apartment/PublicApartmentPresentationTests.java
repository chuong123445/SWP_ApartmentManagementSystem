package com.ancu.proptech.service.apartment;

import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.apartment.*;
import com.ancu.proptech.repository.property.PropertyExternalImportRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.property.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PublicApartmentPresentationTests {
    private final ApartmentRepository apartments=mock(ApartmentRepository.class);
    private final ApartmentGroupRepository groups=mock(ApartmentGroupRepository.class);
    private final PropertyImageService images=mock(PropertyImageService.class);
    private final ApartmentService service=new ApartmentService(apartments,groups,mock(AccountAccessService.class),
        mock(AssetManagementAccess.class),mock(PropertyExternalImportRepository.class),mock(RentalRequestRepository.class),
        images,mock(PropertyRightsPolicy.class));

    @Test void groupedCoverFallsBackToTheMatchingPublicRoom() {
        var room=room();
        when(groups.search(any(),eq(0),eq(6))).thenReturn(new ApartmentGroupRepository.Result(List.of(
            new ApartmentGroupRepository.Group(1L,"Building","Address",BigDecimal.ONE,BigDecimal.TEN,
                BigDecimal.ONE,BigDecimal.TEN,2,4L)),1));
        when(images.urls(1L)).thenReturn(List.of());
        when(apartments.findById(4L)).thenReturn(Optional.of(room));
        when(images.unitUrls(1L,4L,"/images/room.jpg")).thenReturn(List.of("/images/room.jpg"));
        var result=service.grouped(null,null,null,null,null,null,null,0,6,null,null,null);
        assertEquals("/images/room.jpg",result.items().getFirst().thumbnail());
        assertEquals(2,result.items().getFirst().matchingRooms());
        verify(apartments).findById(4L);
    }

    @Test void commonCoverIsPreservedWhenPresent() {
        when(groups.search(any(),eq(0),eq(6))).thenReturn(new ApartmentGroupRepository.Result(List.of(
            new ApartmentGroupRepository.Group(1L,"Building","Address",BigDecimal.ONE,BigDecimal.TEN,
                BigDecimal.ONE,BigDecimal.TEN,2,4L)),1));
        when(images.urls(1L)).thenReturn(List.of("/images/building.jpg"));
        assertEquals("/images/building.jpg",service.grouped(null,null,null,null,null,null,null,0,6,null,null,null).items().getFirst().thumbnail());
        verifyNoInteractions(apartments);
    }

    @Test void publicSummaryAndDetailExposeDeclaredCapacity() {
        var room=room();
        when(apartments.findAll(any(Specification.class),any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(room)));
        when(apartments.findById(4L)).thenReturn(Optional.of(room));
        when(apartments.findOne(any(Specification.class))).thenReturn(Optional.of(room));
        assertEquals(3,service.search(null,null,null,null,null,null,null,0,6).items().getFirst().maxOccupants());
        assertEquals(3,service.detail(4L).maxOccupants());
        room.setMaxOccupants(null);
        assertNull(service.detail(4L).maxOccupants());
    }

    private Apartment room() {
        var owner=new AuthAccount();owner.setId(1L);owner.setFullName("Owner");
        var property=new Property();property.setId(1L);property.setOwner(owner);
        var room=new Apartment();room.setId(4L);room.setProperty(property);room.setMaxOccupants(3);
        room.setAreaM2(BigDecimal.TEN);room.setAdvertisedMonthlyRent(BigDecimal.ONE);
        room.setAvailability(Apartment.Availability.VACANT);room.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);
        room.setCoverImagePath("/images/room.jpg");
        return room;
    }
}
