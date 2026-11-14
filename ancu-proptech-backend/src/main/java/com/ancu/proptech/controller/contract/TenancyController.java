package com.ancu.proptech.controller.contract;
import com.ancu.proptech.dto.contract.TenancyResponse;
import com.ancu.proptech.service.contract.TenancyService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
@RestController @RequiredArgsConstructor
public class TenancyController {
    private final TenancyService tenancies;
    @GetMapping("/api/v1/owner/tenancies") public ResponseEntity<List<TenancyResponse>> owner(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tenancies.owner(jwt));}
    @GetMapping("/api/v1/me/tenancies") public ResponseEntity<List<TenancyResponse>> mine(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tenancies.mine(jwt));}
}
