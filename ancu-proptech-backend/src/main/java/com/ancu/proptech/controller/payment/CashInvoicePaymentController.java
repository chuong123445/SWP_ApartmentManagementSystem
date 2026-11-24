package com.ancu.proptech.controller.payment;

import com.ancu.proptech.dto.payment.CashInvoicePaymentDtos.*;
import com.ancu.proptech.service.payment.CashInvoicePaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class CashInvoicePaymentController {
    private final CashInvoicePaymentService service;
    @PostMapping("/api/v1/owner/invoices/{id}/cash-payment")
    public ResponseEntity<Receipt> confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody Confirm input) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.confirm(jwt, id, input));
    }
}
