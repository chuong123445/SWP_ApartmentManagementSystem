package com.ancu.proptech.dto.apartment;
import java.util.*;
public record OwnerApartmentResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id, @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long propertyId, String propertyName, @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long ownerId,
        String roomNumber, String title, String description, Integer floor, String areaM2,
        String advertisedMonthlyRent, String deposit, Integer electricityIndex, Integer waterIndex,
        Integer maxOccupants, Integer bedrooms, Integer bathrooms, List<String> amenities,
        String publicationStatus, String availability, String propertyApprovalStatus, String thumbnail, long version,
        String electricityUnitPrice,String waterUnitPrice) {}
