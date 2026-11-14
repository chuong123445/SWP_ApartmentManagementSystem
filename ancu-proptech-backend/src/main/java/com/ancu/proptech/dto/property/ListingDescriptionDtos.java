package com.ancu.proptech.dto.property;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
public final class ListingDescriptionDtos {
    public record ListingFacts(
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal areaM2,
        @NotNull @DecimalMin("0.01") @Digits(integer = 13, fraction = 2) BigDecimal monthlyRent,
        @Min(0) @Max(200) Integer floor,
        @Min(1) @Max(1000) Integer maxOccupants,
        @Min(0) @Max(100) Integer bedrooms,
        @Min(0) @Max(100) Integer bathrooms,
        @Size(max = 20) List<@NotBlank @Size(max = 100) String> amenities,
        @Size(max = 4) List<@Positive Long> imageIds
    ) {}

    public record Suggestion(String description) {}

}
