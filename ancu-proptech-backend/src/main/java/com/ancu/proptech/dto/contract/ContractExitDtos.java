package com.ancu.proptech.dto.contract;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.List;
import tools.jackson.databind.JsonNode;
public final class ContractExitDtos {
 private ContractExitDtos(){}
 public enum Action { PROPOSE_TERMINATION,ACCEPT_TERMINATION,REJECT_TERMINATION,WITHDRAW_TERMINATION,PROPOSE_HANDOVER,CONFIRM_HANDOVER,DISPUTE_HANDOVER,CANCEL_HANDOVER }
 public record TermInput(@NotNull LocalDate returnDate,@NotBlank @Size(max=3000) String reason,@NotBlank @Size(max=3000) String clauseReference,
  @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal penaltyAmount,@NotBlank @Pattern(regexp="NONE|OWNER|CUSTOMER") String penaltyPayer){}
 public record HandInput(@NotNull LocalDate returnDate,@Min(0) @Max(2147483647) Long electricityReading,@Min(0) @Max(2147483647) Long waterReading,
  @Min(0) @Max(2147483647) Long electricityStartReading,@Min(0) @Max(2147483647) Long waterStartReading,
  @AssertTrue boolean keysReturned,@NotBlank @Size(max=3000) String conditionNotes,@NotNull @Size(max=5) List<@NotNull @Positive Long> evidenceIds,@Valid HandDetails details){}
 public record Command(@NotNull Action action,@NotBlank @Pattern(regexp="[a-f0-9]{64}") String sourceVersion,@AssertTrue boolean consent,
  @Size(max=3000) String reason,@Valid TermInput termination,@Valid HandInput handover,@Size(max=5) List<@NotNull @Positive Long> evidenceIds){}
 public record Term(String proposerId,LocalDate returnDate,String reason,String clauseReference,String penaltyAmount,String penaltyPayer,String responderId,String responseReason){}
 public record Hand(LocalDate returnDate,String electricityStartReading,String waterStartReading,String electricityReading,String waterReading,String utilityAmount,
  String conditionNotes,boolean keysReturned,List<String> evidenceIds,String disputeReason,String disputedBy,List<String> disputeEvidenceIds){}
 public record Evidence(String id,String filename,String uploaderId,Instant createdAt){}
 public record Event(String id,String actorId,String actorName,String action,String reason,Instant createdAt,JsonNode before,JsonNode after){}
 public record View(String contractId,String contractStatus,String ownerId,String customerId,LocalDate today,LocalDate startDate,LocalDate endDate,String sourceVersion,
  String terminationState,Term termination,String handoverState,Hand handover,boolean canProposeTermination,boolean canRespondTermination,boolean canWithdrawTermination,
  boolean canProposeHandover,boolean canConfirmHandover,boolean canDisputeHandover,boolean canCancelHandover,List<Evidence> evidence,List<Event> history,Document document,Signing signing,boolean canSign){}
 public record HandDetails(@NotBlank @Size(max=300) String location,@NotBlank @Size(max=3000) String inventory,
  @Min(0) @Max(1000) int keyCount,@Size(max=3000) String notes){}
 public record Document(String number,LocalDate contractStartDate,LocalDate contractEndDate,ContractSnapshot snapshot,
  LocalDate returnDate,HandDetails details,String conditionNotes,boolean keysReturned,List<String> evidenceIds,
  String electricityStartReading,String waterStartReading,String electricityReading,String waterReading,String utilityAmount){}
 public record Signing(String contentHash,String state,Instant ownerSignedAt,Instant customerSignedAt,String ownerSignature,String customerSignature){}
 public record SignInput(@NotBlank @Pattern(regexp="[a-f0-9]{64}") String sourceVersion,
  @NotBlank @Pattern(regexp="[a-f0-9]{64}") String contentHash,@NotBlank @Size(max=200000) String signature,@AssertTrue boolean consent){}
 public record Content(byte[] bytes,String contentType){}
}
