package com.ancu.proptech.controller.billing;
import static com.ancu.proptech.dto.billing.UtilityInvoiceAiDtos.*;
import com.ancu.proptech.service.billing.UtilityInvoiceAiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class UtilityInvoiceAiController {
 private final UtilityInvoiceAiService service;
 @PostMapping("/api/v1/owner/contracts/{id}/utility-invoice-suggestion")
 public Suggestion suggest(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Command input){return service.suggest(jwt,id,input);}
}
