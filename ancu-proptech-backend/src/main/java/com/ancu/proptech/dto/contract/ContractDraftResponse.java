package com.ancu.proptech.dto.contract;
import java.time.*;
import java.util.*;
public record ContractDraftResponse(UUID id,UUID rentalRequestId,String contractNumber,String status,long version,
        LocalDate startDate,LocalDate endDate,String monthlyRent,String electricityUnitPrice,String waterUnitPrice,String deposit,
        int paymentDay,String paymentMethod,String usagePurpose,List<ContractClause> clauses,ContractSnapshot snapshot,Instant createdAt) {}
