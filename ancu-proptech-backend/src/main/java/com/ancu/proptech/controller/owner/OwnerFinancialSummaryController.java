package com.ancu.proptech.controller.owner;
import com.ancu.proptech.dto.finance.OwnerFinancialSummary;
import com.ancu.proptech.service.owner.OwnerFinancialSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class OwnerFinancialSummaryController {
    private final OwnerFinancialSummaryService reports;
    @GetMapping("/api/v1/owner/financial-summary")
    public ResponseEntity<OwnerFinancialSummary> read(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId,@RequestParam(required=false) Integer year){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(reports.read(jwt,propertyId,year));}
}
