package com.ancu.proptech.controller.property;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.model.property.PropertyEvidenceFile;
import com.ancu.proptech.service.property.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
@RestController @RequestMapping("/api/v1/me/rental-properties") @RequiredArgsConstructor
public class PropertyApplicationController {
    private final OwnerPropertyService properties;
    private final PropertyDossierService dossiers;
    private final PropertyEvidenceService evidence;
    @GetMapping public ResponseEntity<List<OwnerPropertyResponse>> list(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(properties.applications(jwt));}
    @PostMapping public ResponseEntity<OwnerPropertyCreated> create(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody PropertyApplicationCreate input){return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(properties.createApplication(jwt,input));}
    @PostMapping("/{id}/evidence-files") public ResponseEntity<PropertyEvidenceResponse> upload(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@RequestParam PropertyEvidenceFile.Purpose purpose,@RequestParam MultipartFile file){return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(evidence.upload(jwt,id,purpose,file));}
    @GetMapping("/{id}/verification-dossiers") public ResponseEntity<List<PropertyDossierResponse>> history(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(dossiers.mine(jwt,id));}
    @PostMapping("/{id}/verification-dossiers") public ResponseEntity<PropertyDossierResponse> submit(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody PropertyDossierSubmit input){return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(dossiers.submit(jwt,id,input));}
}
