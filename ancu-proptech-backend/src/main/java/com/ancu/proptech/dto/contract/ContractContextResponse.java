package com.ancu.proptech.dto.contract;
import java.util.*;
public record ContractContextResponse(UUID rentalRequestId,long requestVersion,String sourceVersion,ContractSnapshot snapshot,
        String advertisedMonthlyRent,String suggestedDeposit,List<ContractClause> templateClauses,ContractDraftResponse existingDraft) {}
