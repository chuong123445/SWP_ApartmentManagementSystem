package com.ancu.proptech.dto.billing;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.Instant;

public record InvoiceHistoryResponse(@JsonFormat(shape=JsonFormat.Shape.STRING) Long id,
    @JsonFormat(shape=JsonFormat.Shape.STRING) Long actorId,String action,Instant occurredAt,
    String reason,InvoiceResponse before,InvoiceResponse after) {}
