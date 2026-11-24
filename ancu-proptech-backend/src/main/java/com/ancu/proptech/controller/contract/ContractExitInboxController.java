package com.ancu.proptech.controller.contract;
import com.ancu.proptech.service.contract.ContractExitService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import java.util.List;
@RestController @RequiredArgsConstructor
public class ContractExitInboxController {
 private final ContractExitService service;
 @GetMapping("/api/v1/me/contract-exit-requests")
 public ResponseEntity<List<ContractExitService.PendingRequest>> pending(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.pendingRequests(jwt));}
}
