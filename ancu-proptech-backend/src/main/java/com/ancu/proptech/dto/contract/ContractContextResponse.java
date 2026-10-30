package com.ancu.proptech.dto.contract;
import java.util.*;
public record ContractContextResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long rentalRequestId,long requestVersion,String sourceVersion,ContractSnapshot snapshot,
        String advertisedMonthlyRent,String suggestedDeposit,List<ContractClause> templateClauses,ContractDraftResponse existingDraft,
        java.time.LocalDate rightsValidFrom,java.time.LocalDate rightsValidUntil,SuggestedRates suggestedRates) {
 public record SuggestedRates(String electricityUnitPrice,String waterUnitPrice,String internetFee,String garbageFee) {}
 public ContractContextResponse(Long rentalRequestId,long requestVersion,String sourceVersion,ContractSnapshot snapshot,String advertisedMonthlyRent,String suggestedDeposit,List<ContractClause> templateClauses,ContractDraftResponse existingDraft,java.time.LocalDate rightsValidFrom,java.time.LocalDate rightsValidUntil) {
  this(rentalRequestId,requestVersion,sourceVersion,snapshot,advertisedMonthlyRent,suggestedDeposit,templateClauses,existingDraft,rightsValidFrom,rightsValidUntil,null);
 }
}
