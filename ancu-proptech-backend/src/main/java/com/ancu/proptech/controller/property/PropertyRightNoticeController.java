package com.ancu.proptech.controller.property;
import com.ancu.proptech.service.property.PropertyRightNoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequiredArgsConstructor
public class PropertyRightNoticeController {
    private final PropertyRightNoticeService notices;
    @GetMapping("/api/v1/me/property-notices") public ResponseEntity<List<PropertyRightNoticeService.Notice>> mine(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(notices.mine(jwt));}
}
