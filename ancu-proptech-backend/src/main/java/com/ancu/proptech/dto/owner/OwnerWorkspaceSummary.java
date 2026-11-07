package com.ancu.proptech.dto.owner;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;

public record OwnerWorkspaceSummary(@JsonFormat(shape=JsonFormat.Shape.STRING) Long propertyId,
        LocalDate asOf, LocalDate expiringThrough, long unpaidMonthlyInvoiceCount, long unpaidAdditionalReceiptCount,
        long unpaidCount, long expiringContractCount, long expiredContractCount) {}
