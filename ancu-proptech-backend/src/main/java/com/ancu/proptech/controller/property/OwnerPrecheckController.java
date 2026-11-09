package com.ancu.proptech.controller.property;
import static com.ancu.proptech.dto.property.OwnerPrecheckDtos.*;
import com.ancu.proptech.service.property.ai.OwnerPrecheckService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import jakarta.validation.Valid;
@RestController @RequiredArgsConstructor
public class OwnerPrecheckController {
 private final OwnerPrecheckService service;
 @PostMapping("/api/v1/me/rental-properties/{id}/ai-extract") public ResponseEntity<View> extract(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Request input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.extract(jwt,id,input));}
 @PostMapping({"/api/v1/owner/properties/{id}/ai-precheck","/api/v1/me/rental-properties/{id}/ai-precheck"}) public ResponseEntity<View> check(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Request input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.check(jwt,id,input));}
 @PostMapping({"/api/v1/owner/properties/{id}/ai-precheck/{run}/acknowledge","/api/v1/me/rental-properties/{id}/ai-precheck/{run}/acknowledge"}) public ResponseEntity<Void> acknowledge(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@PathVariable String run,@Valid @RequestBody Acknowledge input){service.acknowledge(jwt,id,run,input);return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();}
}
