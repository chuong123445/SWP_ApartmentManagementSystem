package com.ancu.proptech.dto.finance;

import java.math.BigDecimal;

public record TenantInvoiceTotals(long paidCount, BigDecimal paidAmount, long unpaidCount, BigDecimal unpaidAmount) {
    public View view(String kind) {
        return new View(kind, paidCount, paidAmount.toPlainString(), unpaidCount, unpaidAmount.toPlainString());
    }

    public record View(String kind, long paidCount, String paidAmount, long unpaidCount, String unpaidAmount) {}
}
