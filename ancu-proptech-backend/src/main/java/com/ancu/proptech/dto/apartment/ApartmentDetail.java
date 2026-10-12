package com.ancu.proptech.dto.apartment;
import java.util.*;
public record ApartmentDetail(UUID id, String title, String description, String address, String city, String district,
                              String propertyName, String areaM2, String advertisedMonthlyRent, List<String> images,
                              List<String> amenities, String availability, String publicationStatus,
                              Integer bedrooms, Integer bathrooms, PublicOwner publicOwner, long version) {
    public record PublicOwner(UUID id, String displayName, boolean contactVerified) {}
}
