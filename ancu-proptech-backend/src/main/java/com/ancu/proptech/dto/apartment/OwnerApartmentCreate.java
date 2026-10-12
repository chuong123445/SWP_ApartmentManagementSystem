package com.ancu.proptech.dto.apartment;
import com.ancu.proptech.model.apartment.Apartment;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.*;
@Getter @Setter @NoArgsConstructor
public class OwnerApartmentCreate {
    @NotNull private UUID propertyId;
    @NotBlank @Size(max = 20) private String roomNumber;
    @NotBlank @Size(max = 150) private String title;
    @NotNull @Size(max = 3000) private String description = "";
    @NotNull @Min(0) @Max(200) private Integer floor;
    @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) private BigDecimal areaM2;
    @NotNull @DecimalMin("0") @Digits(integer = 13, fraction = 2) private BigDecimal advertisedMonthlyRent;
    @DecimalMin("0") @Digits(integer = 13, fraction = 2) private BigDecimal deposit;
    @Min(0) private Integer electricityIndex;
    @Min(0) private Integer waterIndex;
    @Min(1) private Integer maxOccupants;
    @Min(0) private Integer bedrooms;
    @Min(0) private Integer bathrooms;
    @NotNull @Size(max = 50) private List<@NotBlank @Size(max = 100) String> amenities = new ArrayList<>();
    @NotNull private Apartment.PublicationStatus publicationStatus = Apartment.PublicationStatus.DRAFT;
    @JsonAnySetter public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unsupported field: " + field);
    }
}
