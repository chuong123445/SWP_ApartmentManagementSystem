package com.ancu.proptech.dto.contract;
import java.time.*;
import java.util.*;
public record ContractDraftResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long rentalRequestId,String contractNumber,String status,long version,
        LocalDate startDate,LocalDate endDate,String monthlyRent,String electricityUnitPrice,String waterUnitPrice,String deposit,
        int paymentDay,String paymentMethod,String usagePurpose,List<ContractClause> clauses,ContractSnapshot snapshot,Instant createdAt,
        String templateType, Signing signing, Lifecycle lifecycle,String waterBillingMode,int occupantCount,String internetFee,String garbageFee) {
    public record Lifecycle(long version,boolean expired,String previousContractId,String renewalContractId,String endReason,Handover handover) {}
    public record Handover(String id,long version,String status,LocalDate returnDate,String electricityReading,String waterReading,String electricityStartReading,String waterStartReading,
        boolean keysReturned,String conditionNotes,String depositAmount,String deductionAmount,String utilityAmount,String refundAmount,
        String extraAmountDue,Instant ownerConfirmedAt,Instant customerConfirmedAt) {}
    public record Signing(String ownerAccountId,String customerAccountId,String contentHash,String state,
            Instant ownerSignedAt,Instant customerSignedAt,String ownerSignature,String customerSignature) {}
}
