package com.ancu.proptech.controller.property;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.service.property.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.util.*;
@RestController @RequiredArgsConstructor
public class PropertyDossierController {
    private final PropertyDossierService dossiers;
    private final PropertyEvidenceService evidence;
    @PostMapping("/api/v1/owner/properties/{id}/evidence-files") public ResponseEntity<PropertyEvidenceResponse> upload(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestParam PropertyEvidenceFile.Purpose purpose,@RequestParam MultipartFile file){return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(evidence.upload(jwt,id,purpose,file));}
    @GetMapping("/api/v1/property-evidence-files/{id}") public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){var f=evidence.download(jwt,id);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(f.filename(),StandardCharsets.UTF_8).build().toString()).contentType(MediaType.parseMediaType(f.contentType())).body(f.content());}
    @PostMapping("/api/v1/owner/properties/{id}/verification-dossiers") public ResponseEntity<PropertyDossierResponse> submit(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody PropertyDossierSubmit input){return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(dossiers.submit(jwt,id,input));}
    @GetMapping("/api/v1/owner/properties/{id}/verification-dossiers") public List<PropertyDossierResponse> mine(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){return dossiers.mine(jwt,id);}
    @GetMapping("/api/v1/admin/property-dossiers") public PageResponse<PropertyDossierResponse> queue(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) PropertyDossier.Status status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size){return dossiers.queue(jwt,status,page,size);}
    @GetMapping("/api/v1/admin/property-dossiers/{id}") public PropertyDossierResponse detail(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){return dossiers.detail(jwt,id);}
    @PostMapping("/api/v1/admin/property-dossiers/{id}/decisions") public PropertyDossierResponse decide(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody PropertyDossierDecision input){return dossiers.decide(jwt,id,input);}
}
