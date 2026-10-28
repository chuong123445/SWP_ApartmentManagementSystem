package com.ancu.proptech.dto.contract;
import java.time.*;
import java.util.*;
public record ContractDraftResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long rentalRequestId,String contractNumber,String status,long version,
        LocalDate startDate,LocalDate endDate,String monthlyRent,String electricityUnitPrice,String waterUnitPrice,String deposit,
        int paymentDay,String paymentMethod,String usagePurpose,List<ContractClause> clauses,ContractSnapshot snapshot,Instant createdAt) {}
