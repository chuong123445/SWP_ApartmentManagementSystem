package com.ancu.proptech.controller.property;
import com.ancu.proptech.dto.property.OwnerPropertyResponse;
import com.ancu.proptech.dto.property.OwnerPropertyCreate;
import com.ancu.proptech.dto.property.OwnerPropertyCreated;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import java.net.URI;
import com.ancu.proptech.service.property.OwnerPropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/owner/properties") @RequiredArgsConstructor
public class OwnerPropertyController {
    private final OwnerPropertyService properties;
    private final com.ancu.proptech.service.property.SourceReceivingAccountService receivingAccounts;
    @PutMapping("/{id}/receiving-account") public ResponseEntity<Void> receivingAccount(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,
            @Valid @RequestBody com.ancu.proptech.dto.property.SourceReceivingAccountUpdate input) {
        receivingAccounts.update(jwt,id,input);return ResponseEntity.noContent().cacheControl(org.springframework.http.CacheControl.noStore()).build();
    }
    private final com.ancu.proptech.service.property.VneidPropertyImportService vneid;
    @GetMapping("/vneid-assets") public ResponseEntity<List<com.ancu.proptech.service.property.VneidPropertyImportService.Candidate>> vneidAssets(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore()).body(vneid.list(jwt));
    }
    @PostMapping("/vneid-imports") public ResponseEntity<OwnerPropertyCreated> importVneid(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody com.ancu.proptech.dto.property.VneidPropertyImportRequest input) {
        var result=vneid.importProperty(jwt,input);
        return ResponseEntity.created(URI.create("/api/v1/owner/properties")).cacheControl(org.springframework.http.CacheControl.noStore()).body(result);
    }
    @GetMapping public List<OwnerPropertyResponse> list(@AuthenticationPrincipal Jwt jwt) { return properties.list(jwt); }
    @PostMapping public ResponseEntity<OwnerPropertyCreated> create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody OwnerPropertyCreate input) {
        var result = properties.create(jwt, input);
        return ResponseEntity.created(URI.create("/api/v1/owner/properties")).body(result);
    }
}
