package com.ancu.proptech.dto.payment;

import com.ancu.proptech.model.payment.OwnerWithdrawal;
import com.ancu.proptech.model.payment.SettlementEntry;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SettlementDtos {
    private SettlementDtos() {}

    public record Request(@NotNull UUID requestKey,
                          @NotNull @Positive @Digits(integer = 15, fraction = 0) BigDecimal amount,
                          @NotBlank @Size(max = 50) String bank,
                          @NotBlank @Pattern(regexp = "[0-9]{4,30}") String accountNumber,
                          @NotBlank @Size(max = 100) String accountHolder) {}

    public enum Action { START, PAID, REJECT, CANCEL }

    public record Decision(@NotNull Action action, @NotNull @PositiveOrZero Long version,
                           @Size(max = 100) String transferReference, @Size(max = 300) String note) {}

    public record Withdrawal(String id, String ownerId, String amount, String bank, String accountNumber,
                             String accountHolder, OwnerWithdrawal.Status status, String transferReference,
                             String note, Instant createdAt, Instant updatedAt, long version,
                             boolean canComplete) {}

    public record Entry(String id, SettlementEntry.Kind kind, String sourceId, String amount, Instant createdAt) {}

    public record Wallet(String received, String available, String reserved, String paid, List<Entry> entries) {}
}
