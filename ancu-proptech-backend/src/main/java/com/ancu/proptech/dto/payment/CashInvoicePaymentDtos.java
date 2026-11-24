package com.ancu.proptech.dto.payment;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

public final class CashInvoicePaymentDtos {
    private CashInvoicePaymentDtos() {}
    public record Confirm(@NotNull @PositiveOrZero Long version, @NotNull LocalDate transactionDate,
                          @Size(max=1000) String note) {}
    public record Receipt(String invoiceId, String cashEntryId, String amount, Instant paidAt) {}
}
