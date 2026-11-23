package com.ancu.proptech.controller.property;
import com.ancu.proptech.service.property.PropertyWithdrawalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class PropertyWithdrawalController {
 private final PropertyWithdrawalService service;
 @PostMapping("/api/v1/me/rental-properties/{id}/withdraw")
 public ResponseEntity<Void> withdraw(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody PropertyWithdrawalService.Input input){
  service.withdraw(jwt,id,input);return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
 }
}
