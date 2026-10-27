package com.ancu.proptech.dto.contract;
import java.util.*;
public record ContractContextResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long rentalRequestId,long requestVersion,String sourceVersion,ContractSnapshot snapshot,
        String advertisedMonthlyRent,String suggestedDeposit,List<ContractClause> templateClauses,ContractDraftResponse existingDraft,
        java.time.LocalDate rightsValidFrom,java.time.LocalDate rightsValidUntil) {}
