package com.ancu.proptech.dto.billing;
import java.time.LocalDate;
import jakarta.validation.constraints.*;
public record RentInvoiceCreate(@NotNull @Min(0) Long billingVersion,@NotNull LocalDate coverageStart,@NotNull LocalDate dueDate) {}
