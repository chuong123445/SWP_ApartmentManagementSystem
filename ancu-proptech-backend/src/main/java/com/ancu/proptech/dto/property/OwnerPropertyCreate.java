package com.ancu.proptech.dto.property;

import com.ancu.proptech.model.property.Property;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.*;

@Getter @Setter @NoArgsConstructor
public class OwnerPropertyCreate {
    @NotNull @Size(min=1,max=4) private java.util.List<Long> imageIds;
    @NotBlank @Size(max = 150) private String name;
    @NotBlank @Size(max = 300) private String address;
    @NotBlank @Size(max = 80) private String city;
    @NotBlank @Size(max = 80) private String district;
    @Size(max = 80) private String ward;
    @NotNull private Property.RentalMode rentalMode;
    @NotNull @Size(min = 1, max = 50) private List<@NotNull @Valid Unit> apartments;

    @JsonSetter("rentalMode") public void readRentalMode(Object value) {
        if (!(value instanceof String text)) throw new IllegalArgumentException("Invalid rentalMode");
        rentalMode = Property.RentalMode.valueOf(text);
    }
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field: " + field); }

    @Getter @Setter @NoArgsConstructor
    public static class Unit {
        @NotBlank @Size(max = 20) private String roomNumber;
        @NotBlank @Size(max = 150) private String title;
        @NotNull @Size(max = 3000) private String description = "";
        @NotNull @Min(0) @Max(200) private Integer floor;
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) private BigDecimal areaM2;
        @NotNull @DecimalMin("0.01") @Digits(integer = 13, fraction = 2) private BigDecimal advertisedMonthlyRent;
        @DecimalMin("0") @Digits(integer = 13, fraction = 2) private BigDecimal deposit;
        @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal electricityUnitPrice;
        @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal waterUnitPrice;
        @Min(0) private Integer bedrooms;
        @Min(0) private Integer bathrooms;
        @Min(1) private Integer maxOccupants;
        @Min(0) private Integer electricityIndex;
        @Min(0) private Integer waterIndex;
        @NotNull @Size(max = 50) private List<@NotBlank @Size(max = 100) String> amenities = new ArrayList<>();
        @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field: " + field); }
    }
}
