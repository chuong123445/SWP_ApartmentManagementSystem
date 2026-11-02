package com.ancu.proptech.dto.billing;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
@Getter @Setter @NoArgsConstructor
public class MeterReadingSave {
 @NotNull @Pattern(regexp="\\d{4}-\\d{2}") private String period;
 @NotNull @Min(0) private Long baselineVersion;
 @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal electricityEndReading;
 @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal waterEndReading;
 private boolean applyPropertyRates;
 @Min(0) private Long settingsVersion;
}
