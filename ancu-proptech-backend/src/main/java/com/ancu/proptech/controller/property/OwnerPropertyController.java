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
    @GetMapping public List<OwnerPropertyResponse> list(@AuthenticationPrincipal Jwt jwt) { return properties.list(jwt); }
    @PostMapping public ResponseEntity<OwnerPropertyCreated> create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody OwnerPropertyCreate input) {
        var result = properties.create(jwt, input);
        return ResponseEntity.created(URI.create("/api/v1/owner/properties")).body(result);
    }
}
