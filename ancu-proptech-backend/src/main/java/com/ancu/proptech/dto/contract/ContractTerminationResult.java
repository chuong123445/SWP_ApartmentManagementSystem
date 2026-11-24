package com.ancu.proptech.dto.contract;
import java.time.Instant;
public record ContractTerminationResult(String contractId,String state,String action,String actorId,String actorName,String actorRole,Instant updatedAt,String reason,String proposalReason,String returnDate){}
