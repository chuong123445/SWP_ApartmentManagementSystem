package com.ancu.proptech.dto.apartment;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Request body for updating basic (non-sensitive) apartment fields.
 * These changes take effect immediately regardless of property approval status.
 */
@Getter @Setter @NoArgsConstructor
public class ApartmentBasicUpdate {
    @NotNull @Min(0) private Long version;
    @NotBlank @Size(max = 150) private String title;
    @NotNull @Size(max = 3000) private String description;
    @Min(0) @Max(200) private Integer floor;
    @Min(1) private Integer maxOccupants;
    @Min(0) private Integer bedrooms;
    @Min(0) private Integer bathrooms;
    @NotNull @Size(max = 50) private List<@NotBlank @Size(max = 100) String> amenities = new ArrayList<>();

    @JsonAnySetter
    public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unsupported field: " + field);
    }
}
