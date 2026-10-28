package com.ancu.proptech.dto.apartment;

public record ApartmentSummary(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id, String title, String address, String city, String district,
                               String areaM2, String advertisedMonthlyRent, String thumbnail,
                               String availability, Integer bedrooms, Integer bathrooms,String lessorRelationship) {}
