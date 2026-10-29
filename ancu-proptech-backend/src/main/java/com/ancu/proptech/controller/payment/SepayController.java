package com.ancu.proptech.controller.payment;
import com.ancu.proptech.dto.payment.SepayDtos.*;
import com.ancu.proptech.service.payment.SepayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequiredArgsConstructor
public class SepayController {
 private final SepayService service;
 private <T> ResponseEntity<T> ok(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
 @PostMapping("/api/v1/owner/payments/sepay/bank-accounts") public ResponseEntity<BankPage> banks(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ApiToken body){return ok(service.banks(jwt,body));}
 @PostMapping("/api/v1/owner/payments/sepay/virtual-accounts") public ResponseEntity<VaPage> vas(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody VaRequest body){return ok(service.vas(jwt,body));}
 @GetMapping("/api/v1/owner/payments/sepay") public ResponseEntity<Connection> config(@AuthenticationPrincipal Jwt jwt){return ok(service.config(jwt));}
 @PutMapping("/api/v1/owner/payments/sepay") public ResponseEntity<Connection> configure(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Setup body){return ok(service.configure(jwt,body));}
 @PatchMapping("/api/v1/owner/payments/sepay/status") public ResponseEntity<Connection> enabled(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Status body){return ok(service.enabled(jwt,body.enabled(),body.version()));}
 @PostMapping("/api/v1/owner/payments/sepay/rotate-key") public ResponseEntity<Connection> rotate(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Rotate body){return ok(service.rotate(jwt,body.version()));}
 @GetMapping("/api/v1/owner/payments/sepay/events") public ResponseEntity<List<Event>> events(@AuthenticationPrincipal Jwt jwt){return ok(service.history(jwt));}
 @PostMapping("/api/v1/owner/payments/sepay/test-payments") public ResponseEntity<TestReceipt> createTest(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody TestPaymentRequest body){return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(service.createTest(jwt,body));}
 @GetMapping("/api/v1/owner/payments/sepay/test-payments") public ResponseEntity<List<TestReceipt>> testHistory(@AuthenticationPrincipal Jwt jwt){return ok(service.testHistory(jwt));}
 @GetMapping("/api/v1/invoices/{id}/payment") public ResponseEntity<Payment> status(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ok(service.status(jwt,id));}
 @PostMapping("/api/v1/invoices/{id}/payment") public ResponseEntity<Payment> payment(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ok(service.payment(jwt,id));}
 @PostMapping(value="/api/v1/payments/sepay/webhooks/{ownerId}",consumes=MediaType.APPLICATION_JSON_VALUE) public ResponseEntity<Map<String,Boolean>> webhook(@PathVariable Long ownerId,@RequestHeader(value="Authorization",required=false) String authorization,@Valid @RequestBody Webhook body){service.webhook(ownerId,authorization,body);return ok(Map.of("success",true));}
}
