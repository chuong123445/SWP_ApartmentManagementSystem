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
@RestController @RequestMapping("/api/v1/owner/apartments") @RequiredArgsConstructor
public class OwnerApartmentController {
    private final OwnerApartmentService apartments;
    @PatchMapping("/{id}/prices") public OwnerApartmentResponse prices(@AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,@Valid @RequestBody ApartmentPrices input){return apartments.prices(jwt,id,input);}
    @PostMapping("/{id}/publication") public OwnerApartmentResponse publication(@AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id, @Valid @RequestBody ApartmentPublication input) { return apartments.publication(jwt,id,input); }
    @GetMapping public List<OwnerApartmentResponse> list(@AuthenticationPrincipal Jwt jwt) { return apartments.list(jwt); }
    @PostMapping public ResponseEntity<OwnerApartmentResponse> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody OwnerApartmentCreate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(apartments.create(jwt, request));
    }
}
