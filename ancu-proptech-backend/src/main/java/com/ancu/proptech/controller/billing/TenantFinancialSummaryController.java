package com.ancu.proptech.controller.billing;

import com.ancu.proptech.dto.finance.TenantInvoiceTotals;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.repository.finance.FinancialReportRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TenantFinancialSummaryController {
    private final AccountAccessService access;
    private final FinancialReportRepository reports;

    @GetMapping("/api/v1/me/financial-summary")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TenantInvoiceTotals.View>> read(@AuthenticationPrincipal Jwt jwt) {
        Long customerId = access.customer(jwt).getId();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(List.of(
            reports.tenantInvoices(customerId, RentalInvoice.Status.SENT, RentalInvoice.Kind.RENT).view("RENT"),
            reports.tenantInvoices(customerId, RentalInvoice.Status.SENT, RentalInvoice.Kind.UTILITY).view("UTILITY"),
            reports.tenantInvoices(customerId, RentalInvoice.Status.SENT, RentalInvoice.Kind.LEGACY).view("LEGACY"),
            reports.tenantAdditionalInvoices(customerId).view("ADDITIONAL")
        ));
    }
}
