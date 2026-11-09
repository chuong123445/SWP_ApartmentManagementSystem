package com.ancu.proptech.dto.apartment;
public record PropertyListingSummary(String propertyId,String name,String address,String minRent,String maxRent,
                                     String minArea,String maxArea,long matchingRooms,String thumbnail) {}
