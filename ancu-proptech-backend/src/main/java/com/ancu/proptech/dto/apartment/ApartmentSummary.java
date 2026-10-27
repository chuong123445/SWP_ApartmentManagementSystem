package com.ancu.proptech.dto.apartment;
import java.util.UUID;
public record ApartmentSummary(UUID id, String title, String address, String city, String district,
                               String areaM2, String advertisedMonthlyRent, String thumbnail,
                               String availability, Integer bedrooms, Integer bathrooms,String lessorRelationship) {}
