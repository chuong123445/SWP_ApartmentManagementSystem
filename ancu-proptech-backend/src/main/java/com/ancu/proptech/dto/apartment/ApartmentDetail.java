package com.ancu.proptech.dto.apartment;
import java.util.*;
public record ApartmentDetail(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id, String title, String description, String address, String city, String district,
                              String propertyName, String areaM2, String advertisedMonthlyRent, List<String> images,
                              List<String> amenities, String availability, String publicationStatus,
                              Integer bedrooms, Integer bathrooms, PublicOwner publicOwner, long version,
                              String electricityUnitPrice,String waterUnitPrice,String lessorRelationship,java.time.LocalDate rightsValidFrom,java.time.LocalDate rightsValidUntil,boolean rentalRightsAvailable) {
    public record PublicOwner(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id, String displayName, boolean contactVerified) {}
}
