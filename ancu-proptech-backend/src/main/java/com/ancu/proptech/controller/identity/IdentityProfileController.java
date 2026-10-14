package com.ancu.proptech.controller.identity;
import com.ancu.proptech.dto.identity.*;
import com.ancu.proptech.service.identity.IdentityProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequiredArgsConstructor
public class IdentityProfileController {
    private final IdentityProfileService identities;
    @GetMapping("/api/v1/me/identity")
    public ResponseEntity<IdentityProfileResponse> mine(@AuthenticationPrincipal Jwt jwt){
        var result=identities.mine(jwt);return result==null?ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build():ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);
    }
    @PutMapping(value="/api/v1/me/identity",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public IdentityProfileResponse save(@AuthenticationPrincipal Jwt jwt,@Valid @RequestPart("profile") IdentityProfileInput profile,
            @RequestPart(value="front",required=false) MultipartFile front,@RequestPart(value="back",required=false) MultipartFile back){return identities.save(jwt,profile,front,back);}
    @GetMapping("/api/v1/me/identity/documents/{side}")
    public ResponseEntity<byte[]> document(@AuthenticationPrincipal Jwt jwt,@PathVariable String side){
        var image=identities.download(jwt,side);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"identity-"+side+(image.contentType().equals("image/png")?".png":".jpg")+"\"")
                .contentType(MediaType.parseMediaType(image.contentType())).body(image.content());
    }
}
