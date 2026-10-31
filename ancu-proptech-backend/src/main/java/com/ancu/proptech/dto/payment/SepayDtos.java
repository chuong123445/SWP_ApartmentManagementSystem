package com.ancu.proptech.dto.payment;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
public final class SepayDtos {
 private SepayDtos(){}
 public record ApiToken(@NotBlank @Size(max=4096) String apiToken,@Min(1) int page){}
 public record VaRequest(@NotBlank @Size(max=4096) String apiToken,@NotBlank @Pattern(regexp="[A-Za-z0-9-]{1,64}") String bankAccountId,@Min(1) int page){}
 public record BankAccount(String id,String bank,String bankBin,String accountNumber,String accountHolderName,String accountType){}
 public record VirtualAccount(String id,String number,String holder){}
 public record BankPage(java.util.List<BankAccount> items,int page,boolean hasMore){}
 public record VaPage(java.util.List<VirtualAccount> items,int page,boolean hasMore){}
 public record Setup(@NotBlank @Size(max=4096) String apiToken,
  @NotBlank @Pattern(regexp="[A-Za-z0-9-]{1,64}") String bankAccountId,
  @Pattern(regexp="[A-Za-z0-9-]{1,64}") String virtualAccountId,
  boolean enabled,@NotNull @Min(0) Long version){}
 public record Status(@NotNull Boolean enabled,@NotNull @Min(0) Long version){}
 public record Rotate(@NotNull @Min(0) Long version){}
 public record Connection(boolean configured,String bank,String accountNumber,String accountHolderName,String virtualAccount,
  boolean enabled,long version,String webhookUrl,Instant lastWebhookAt,String webhookSecret){}
 public record Payment(String status,String paymentCode,String amount,String bank,String accountNumber,String accountHolderName,String qrUrl,Instant paidAt){}
 public record TestPaymentRequest(@NotNull @DecimalMin("1") @Digits(integer=9,fraction=0) BigDecimal amount,@Positive Long contractId){}
 public record TestRecipient(String contractId,String tenantName,String roomNumber){}
 public record TestReceipt(String id,Instant createdAt,Payment payment,String contractId,String tenantName,String roomNumber,String ownerName){}
 public record Event(String transactionId,String invoiceId,String testPaymentId,String result,String amount,Instant receivedAt){}
 // SePay có thể thêm trường mới: chỉ đọc các dữ liệu cần đối soát, không tin trạng thái do client gửi.
 @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown=true)
 public record Webhook(@NotNull @PositiveOrZero Long id,@NotBlank @Size(max=100) String gateway,
  @NotBlank @Size(max=40) String accountNumber,@Size(max=40) String subAccount,
  @Size(max=100) String code,@NotNull @Size(max=5000) String content,
  @NotBlank @Pattern(regexp="in|out") String transferType,
  @NotNull @DecimalMin("1") @Digits(integer=20,fraction=0) BigDecimal transferAmount){}
}
