package com.ancu.proptech.controller.auth;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.service.auth.AccountReauthenticationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class AccountSecurityController {
    private final AccountReauthenticationService security;
    @GetMapping("/api/v1/me/security") public ResponseEntity<AccountReauthenticationService.Capabilities> capabilities(@AuthenticationPrincipal Jwt jwt){return privateResponse(security.capabilities(jwt));}
    @PostMapping("/api/v1/me/reauthentications") public ResponseEntity<AccountReauthenticationService.Challenge> begin(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ReauthenticationRequest input){return privateResponse(security.begin(jwt,input.getPurpose()));}
    @PostMapping("/api/v1/me/reauthentications/{id}/confirm") public ResponseEntity<AccountReauthenticationService.Proof> confirm(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody ReauthenticationConfirm input){return privateResponse(security.confirm(jwt,id,input));}
    private <T> ResponseEntity<T> privateResponse(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
}
