package com.ancu.proptech.dto.billing;
import java.time.LocalDate;
public record RentBillingContext(String contractId,int cycleMonths,LocalDate coverageStart,LocalDate coverageEnd,int months,
 String monthlyRent,String totalAmount,LocalDate dueDate,long billingVersion,String existingDraftId,boolean hasPartialDays,String automationMode) {}
