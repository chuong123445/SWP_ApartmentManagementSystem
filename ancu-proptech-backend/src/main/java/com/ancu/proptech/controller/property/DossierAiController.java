package com.ancu.proptech.controller.property;
import com.ancu.proptech.service.property.ai.DossierAiReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;

@RestController @RequiredArgsConstructor
public class DossierAiController {
    private final DossierAiReviewService reviews;
    public record Retry(@NotNull @PositiveOrZero Long version){}
    @GetMapping("/api/v1/admin/property-dossiers/{id}/ai-review")
    public ResponseEntity<DossierAiReviewService.View> read(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(reviews.read(jwt,id));}
    @PostMapping("/api/v1/admin/property-dossiers/{id}/ai-review/retry")
    public ResponseEntity<DossierAiReviewService.View> retry(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Retry input){return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(reviews.retry(jwt,id,input.version()));}
}
