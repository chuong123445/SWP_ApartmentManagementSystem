package com.ancu.proptech.dto.billing;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
@Getter @Setter @NoArgsConstructor
public class InvoiceCreate {
    @NotNull @Pattern(regexp="\\d{4}-\\d{2}") private String period;
    @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal electricityEndReading;
    @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal waterEndReading;
    @NotNull @Min(0) private Long baselineVersion;
    @NotNull private LocalDate dueDate;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
