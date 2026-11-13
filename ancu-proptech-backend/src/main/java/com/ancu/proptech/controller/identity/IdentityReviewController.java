package com.ancu.proptech.controller.identity;
import com.ancu.proptech.dto.identity.IdentitySubmissionDtos.*;
import com.ancu.proptech.model.identity.IdentitySubmission;
import com.ancu.proptech.service.identity.IdentityReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class IdentityReviewController {
 private final IdentityReviewService reviews;
 private <T> ResponseEntity<T> ok(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
 @GetMapping("/api/v1/me/identity-submissions") public ResponseEntity<View> mine(@AuthenticationPrincipal Jwt jwt){var result=reviews.mine(jwt);return result==null?ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build():ok(result);}
 @PostMapping("/api/v1/me/identity-submissions") public ResponseEntity<View> submit(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Submit input){return ok(reviews.submit(jwt,input));}
 @GetMapping("/api/v1/admin/identity-submissions") public ResponseEntity<Listing> list(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="PENDING") IdentitySubmission.Status status,@RequestParam(defaultValue="0") int page){return ok(reviews.list(jwt,status,page));}
 @GetMapping("/api/v1/admin/identity-submissions/{id}") public ResponseEntity<View> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ok(reviews.detail(jwt,id));}
 @PostMapping("/api/v1/admin/identity-submissions/{id}/decision") public ResponseEntity<View> decide(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Decision input){return ok(reviews.decide(jwt,id,input));}
 @GetMapping("/api/v1/admin/identity-submissions/{id}/documents/{side}") public ResponseEntity<byte[]> image(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@PathVariable String side){var image=reviews.image(jwt,id,side);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=identity-"+side+(image.contentType().equals("image/png")?".png":".jpg")).contentType(MediaType.parseMediaType(image.contentType())).body(image.content());}
}
