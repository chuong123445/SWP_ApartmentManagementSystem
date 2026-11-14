package com.ancu.proptech.dto.billing;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor
public class InvoiceDraftChange extends InvoiceCancel {
    @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal electricityEndReading;
    @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal waterEndReading;
    @NotNull private LocalDate dueDate;
}
