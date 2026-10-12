package com.ancu.proptech.controller.billing;
import com.ancu.proptech.dto.billing.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.service.billing.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.UUID;
@RestController @RequiredArgsConstructor
public class InvoiceController {
    private final InvoiceService invoices;
    @GetMapping("/api/v1/owner/contracts/{id}/billing-context") public BillingContext context(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){return invoices.context(jwt,id);}
    @PostMapping("/api/v1/owner/contracts/{id}/invoices") public ResponseEntity<InvoiceResponse> create(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody InvoiceCreate request){var result=invoices.create(jwt,id,request);return ResponseEntity.created(URI.create("/api/v1/invoices/"+result.id())).body(result);}
    @PostMapping("/api/v1/owner/invoices/{id}/send") public InvoiceResponse send(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody InvoiceSend request){return invoices.send(jwt,id,request);}
    @GetMapping("/api/v1/owner/invoices") public PageResponse<InvoiceResponse> owner(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return invoices.owner(jwt,page,size);}
    @GetMapping("/api/v1/me/invoices") public PageResponse<InvoiceResponse> mine(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return invoices.mine(jwt,page,size);}
    @GetMapping("/api/v1/invoices/{id}") public InvoiceResponse detail(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){return invoices.detail(jwt,id);}
}
