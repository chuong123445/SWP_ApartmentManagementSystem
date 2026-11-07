package com.ancu.proptech.controller.owner;

import com.ancu.proptech.dto.owner.OwnerWorkspaceSummary;
import com.ancu.proptech.service.owner.OwnerWorkspaceSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class OwnerWorkspaceSummaryController {
    private final OwnerWorkspaceSummaryService summaries;
    @GetMapping("/api/v1/owner/workspace-summary")
    public ResponseEntity<OwnerWorkspaceSummary> read(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(summaries.read(jwt,propertyId));
    }
}
