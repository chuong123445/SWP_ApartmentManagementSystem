package com.ancu.proptech.controller.apartment;
import com.ancu.proptech.dto.apartment.*;
import com.ancu.proptech.service.apartment.OwnerApartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/owner/apartments") @RequiredArgsConstructor
public class OwnerApartmentController {
    private final OwnerApartmentService apartments;
    @PostMapping("/{id}/publication") public OwnerApartmentResponse publication(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id, @Valid @RequestBody ApartmentPublication input) { return apartments.publication(jwt,id,input); }
    @GetMapping public List<OwnerApartmentResponse> list(@AuthenticationPrincipal Jwt jwt) { return apartments.list(jwt); }
    @PostMapping public ResponseEntity<OwnerApartmentResponse> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody OwnerApartmentCreate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(apartments.create(jwt, request));
    }
    /** Update basic fields (title, description, floor, rooms, amenities) — applied immediately. */
    @PatchMapping("/{id}/basic") public OwnerApartmentResponse updateBasic(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id, @Valid @RequestBody ApartmentBasicUpdate request) {
        return apartments.updateBasic(jwt, id, request);
    }
    /** Update sensitive fields (rent, deposit, electricity/water, area).
     *  If property is APPROVED the change enters a pending re-approval queue;
     *  otherwise it is applied immediately. */
    @PatchMapping("/{id}/sensitive") public OwnerApartmentResponse updateSensitive(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id, @Valid @RequestBody ApartmentSensitiveUpdate request) {
        return apartments.updateSensitive(jwt, id, request);
    }
}

