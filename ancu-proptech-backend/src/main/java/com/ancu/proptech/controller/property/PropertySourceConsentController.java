package com.ancu.proptech.controller.property;
import com.ancu.proptech.dto.auth.OwnerUpgradeRequest;
import com.ancu.proptech.service.property.PropertySourceConsentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class PropertySourceConsentController {
    private final PropertySourceConsentService service;
    @GetMapping("/api/v1/me/property-source-consent") public ResponseEntity<PropertySourceConsentService.Status> status(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.status(jwt));}
    @PostMapping("/api/v1/me/property-source-consent") public ResponseEntity<PropertySourceConsentService.Status> consent(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody OwnerUpgradeRequest input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.consent(jwt,input));}
}
