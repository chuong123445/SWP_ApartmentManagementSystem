package com.ancu.proptech.dto.finance;
import com.ancu.proptech.model.finance.CashEntry.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
public final class CashDtos {
    private CashDtos() {}
    public record Create(@NotNull @Positive Long propertyId,
        @NotBlank @Pattern(regexp="[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}") String requestKey,
        @NotNull Direction direction,@NotNull Method paymentMethod,
        @NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) BigDecimal amount,
        @NotNull LocalDate transactionDate,@NotBlank @Size(max=100) String category,
        @NotBlank @Size(max=200) String counterparty,@NotBlank @Size(max=2000) String description,
        @Size(max=200) String reference) {}
    public record Post(@NotNull @PositiveOrZero Long version) {}
    public record Cancel(@NotNull @PositiveOrZero Long version,@NotBlank @Size(max=1000) String reason) {}
    public record Entry(Long id,String code,Long propertyId,String propertyName,Direction direction,Status status,
        Method paymentMethod,String amount,LocalDate transactionDate,String category,String counterparty,
        String description,String reference,Instant createdAt,Instant postedAt,Instant cancelledAt,
        Long createdBy,Long postedBy,Long cancelledBy,String cancellationReason,long version) {}
    public record Summary(String income,String expense,String netCashflow,long postedCount) {}
}
