package com.ancu.proptech.controller.contract;
import com.ancu.proptech.dto.contract.ContractTerminationResult;
import com.ancu.proptech.service.contract.ContractTerminationResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import java.util.List;
@RestController @RequiredArgsConstructor
public class ContractTerminationResultController {
 private final ContractTerminationResultService service;
 @GetMapping("/api/v1/me/contract-termination-results")
 public ResponseEntity<List<ContractTerminationResult>> latest(@AuthenticationPrincipal Jwt jwt,@RequestParam List<Long> ids){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.latest(jwt,ids));}
}
