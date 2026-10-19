package com.ancu.proptech.dto.apartment;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Request body for updating sensitive apartment fields.
 * When the parent property is already APPROVED, changes are stored as a pending
 * edit and only applied after admin approval. Otherwise they are applied immediately.
 */
@Getter @Setter @NoArgsConstructor
public class ApartmentSensitiveUpdate {
    @NotNull @Min(0) private Long version;
    @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) private BigDecimal areaM2;
    @NotNull @DecimalMin("0") @Digits(integer = 13, fraction = 2) private BigDecimal advertisedMonthlyRent;
    @DecimalMin("0") @Digits(integer = 13, fraction = 2) private BigDecimal deposit;
    @Min(0) private Integer electricityIndex;
    @Min(0) private Integer waterIndex;

    @JsonAnySetter
    public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unsupported field: " + field);
    }
}
