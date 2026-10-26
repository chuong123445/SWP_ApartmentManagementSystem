package com.ancu.proptech.dto.apartment;
import java.util.*;
public record OwnerApartmentResponse(UUID id, UUID propertyId, String propertyName, UUID ownerId,
        String roomNumber, String title, String description, Integer floor, String areaM2,
        String advertisedMonthlyRent, String deposit, Integer electricityIndex, Integer waterIndex,
        Integer maxOccupants, Integer bedrooms, Integer bathrooms, List<String> amenities,
        String publicationStatus, String availability, String propertyApprovalStatus, String thumbnail,
        String editApprovalStatus, ApartmentPendingEditResponse pendingEdit, long version) {}

