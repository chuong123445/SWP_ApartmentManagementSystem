package com.ancu.proptech.dto.apartment;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

/** Giá niêm yết mới, không thay đơn giá đã chốt trong hợp đồng. */
@Getter @Setter @NoArgsConstructor
public class ApartmentPrices {
    @NotNull @Min(0) private Long version;
    @NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) private BigDecimal monthlyRent;
    @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal electricityUnitPrice;
    @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal waterUnitPrice;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
