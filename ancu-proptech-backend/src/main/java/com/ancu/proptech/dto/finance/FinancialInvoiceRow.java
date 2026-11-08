package com.ancu.proptech.dto.finance;
import java.math.BigDecimal;
import java.time.*;
/** Internal scalar projection; never returns private contracts, documents or signature bytes. */
public record FinancialInvoiceRow(Long propertyId,String period,LocalDate dueDate,BigDecimal rent,BigDecimal electricity,
        BigDecimal water,BigDecimal internet,BigDecimal garbage,BigDecimal total,BigDecimal received,Instant paidAt) {}
