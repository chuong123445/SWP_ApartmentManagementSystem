package com.ancu.proptech.controller.contract;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.contract.RenewalInboxItem;
import com.ancu.proptech.model.contract.ContractRenewalRequest;
import com.ancu.proptech.service.contract.ContractRenewalInboxService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController @RequiredArgsConstructor
public class ContractRenewalInboxController {
    private final ContractRenewalInboxService inbox;
    @GetMapping("/api/v1/owner/renewal-requests")
    public PageResponse<RenewalInboxItem> inbox(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId,@RequestParam(required=false) ContractRenewalRequest.Status status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size) {
        return inbox.inbox(jwt,propertyId,status,page,size);
    }
}
