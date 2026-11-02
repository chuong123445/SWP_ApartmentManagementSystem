package com.ancu.proptech.dto.billing;
import java.time.Instant;
public record SavedMeterReading(String electricityEndReading,String waterEndReading,boolean propertyRates,Instant savedAt) {}
