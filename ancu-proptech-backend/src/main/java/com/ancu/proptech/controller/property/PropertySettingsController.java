package com.ancu.proptech.controller.property;
import com.ancu.proptech.dto.property.PropertySettingsDtos.*;
import com.ancu.proptech.service.property.PropertySettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
@RestController @RequestMapping("/api/v1/owner/properties/{id}/settings") @RequiredArgsConstructor
public class PropertySettingsController {
 private final PropertySettingsService service;
 @GetMapping public ResponseEntity<View> get(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.get(jwt,id));}
 @PutMapping public ResponseEntity<View> save(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Save input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.save(jwt,id,input));}
}
