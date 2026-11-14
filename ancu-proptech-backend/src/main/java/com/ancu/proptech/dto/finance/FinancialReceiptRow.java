package com.ancu.proptech.dto.finance;
import java.math.BigDecimal;
import java.time.Instant;
public record FinancialReceiptRow(Long propertyId,BigDecimal amount,Instant paidAt) {}
