package com.ancu.proptech.controller.contract;
import com.ancu.proptech.dto.contract.*;
import com.ancu.proptech.service.contract.ContractDraftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.*;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class ContractDraftController {
    private final ContractDraftService drafts;
    @GetMapping("/owner/rental-requests/{id}/contract-context")
    public ContractContextResponse context(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return drafts.context(jwt,id); }
    @PostMapping("/owner/rental-requests/{id}/contract")
    public ResponseEntity<ContractDraftResponse> create(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody ContractDraftCreate input) {
        var result=drafts.create(jwt,id,input);return ResponseEntity.created(URI.create("/api/v1/contracts/"+result.id())).body(result);
    }
    @GetMapping("/owner/contract-drafts")
    public List<ContractDraftResponse> owner(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) UUID propertyId) { return drafts.ownerList(jwt,propertyId); }
    @GetMapping("/me/contract-drafts") public List<ContractDraftResponse> customer(@AuthenticationPrincipal Jwt jwt) { return drafts.customerList(jwt); }
    @GetMapping("/contracts/{id}") public ContractDraftResponse get(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return drafts.get(jwt,id); }
    @PutMapping("/owner/contracts/{id}/draft")
    public ContractDraftResponse update(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody ContractDraftUpdate input) { return drafts.update(jwt,id,input); }
}
