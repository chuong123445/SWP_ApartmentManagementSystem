package com.ancu.proptech.controller.auth;

import com.ancu.proptech.dto.auth.AdminAccountDtos.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.service.auth.AdminAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/accounts")
public class AdminAccountController {
    private final AdminAccountService service;

    @GetMapping
    public ResponseEntity<PageResponse<Account>> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "ALL") Filter filter,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(jwt, q, filter, page, size));
    }

    @PostMapping("/{id}/actions")
    public ResponseEntity<Result> command(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody Command command) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.command(jwt, id, command));
    }
}
