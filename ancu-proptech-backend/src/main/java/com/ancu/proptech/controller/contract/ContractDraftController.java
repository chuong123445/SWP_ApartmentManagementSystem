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
    private final com.ancu.proptech.service.contract.ContractPdfService pdf;
    private final com.ancu.proptech.service.contract.ContractLifecycleService lifecycle;
    @GetMapping("/owner/rental-requests/{id}/contract-context")
    public ContractContextResponse context(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id) { return drafts.context(jwt,id); }
    @PostMapping("/owner/rental-requests/{id}/contract")
    public ResponseEntity<ContractDraftResponse> create(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody ContractDraftCreate input) {
        var result=drafts.create(jwt,id,input);return ResponseEntity.created(URI.create("/api/v1/contracts/"+result.id())).body(result);
    }
    @GetMapping("/owner/contract-drafts")
    public List<ContractDraftResponse> owner(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId) { return drafts.ownerList(jwt,propertyId); }
    @GetMapping("/me/contract-drafts") public List<ContractDraftResponse> customer(@AuthenticationPrincipal Jwt jwt) { return drafts.customerList(jwt); }
    @GetMapping("/contracts/{id}") public ContractDraftResponse get(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id) { return drafts.get(jwt,id); }
    @PutMapping("/owner/contracts/{id}/draft")
    public ContractDraftResponse update(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody ContractDraftUpdate input) { return drafts.update(jwt,id,input); }
    @GetMapping(value="/contracts/{id}/pdf",produces="application/pdf")
    public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id) {
        var contract=drafts.get(jwt,id);
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
            .header("X-Content-Type-Options","nosniff")
            .header("Content-Disposition","inline; filename=\""+contract.contractNumber()+".pdf\"")
            .body(pdf.render(contract));
    }
    @PostMapping("/contracts/{id}/signatures")
    public ContractDraftResponse sign(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody ContractSignatureRequest input) {
        return drafts.sign(jwt,id,input);
    }
    @GetMapping("/owner/contracts/{id}/renewal-context")
    public ContractContextResponse renewalContext(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return lifecycle.renewalContext(jwt,id);}
    @PostMapping("/owner/contracts/{id}/renewals")
    public ResponseEntity<ContractDraftResponse> renew(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody ContractDraftCreate input){
        var result=lifecycle.renew(jwt,id,input);return ResponseEntity.created(URI.create("/api/v1/contracts/"+result.id())).body(result);
    }
    @PostMapping("/owner/contracts/{id}/cancel-renewal")
    public ContractDraftResponse cancelRenewal(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody LifecycleConfirm input){return lifecycle.cancelRenewal(jwt,id,input);}
    @PostMapping("/owner/contracts/{id}/handover")
    public ContractDraftResponse handover(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody HandoverCreate input){return lifecycle.proposeHandover(jwt,id,input);}
    @PostMapping("/contracts/{id}/handover/confirm")
    public ContractDraftResponse confirmHandover(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody LifecycleConfirm input){return lifecycle.confirmHandover(jwt,id,input);}
    @PostMapping("/owner/contracts/{id}/handover/cancel")
    public ContractDraftResponse cancelHandover(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody LifecycleConfirm input){return lifecycle.cancelHandover(jwt,id,input);}
}
