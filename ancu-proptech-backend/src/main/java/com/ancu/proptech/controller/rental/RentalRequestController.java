package com.ancu.proptech.controller.rental;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.rental.*;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.service.rental.RentalRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.net.URI;

@RestController @RequiredArgsConstructor
public class RentalRequestController {
    private final RentalRequestService requests;
    @PostMapping("/api/v1/apartments/{id}/rental-requests")
    public ResponseEntity<RentalRequestResponse> submit(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody RentalRequestCreate input) {
        var result = requests.submit(jwt, id, input);
        return ResponseEntity.created(URI.create("/api/v1/me/rental-requests")).body(result);
    }
    @GetMapping("/api/v1/me/rental-requests")
    public PageResponse<RentalRequestResponse> mine(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return requests.mine(jwt, page, size);
    }
    @GetMapping("/api/v1/me/apartments/{id}/rental-requests")
    public java.util.List<RentalRequestResponse> forApartment(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return requests.forApartment(jwt, id);
    }
    @PostMapping("/api/v1/me/rental-requests/{id}/cancel")
    public RentalRequestResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody RentalRequestCancel input) {
        return requests.cancel(jwt, id, input);
    }
    @GetMapping("/api/v1/owner/rental-requests")
    public PageResponse<RentalRequestResponse> inbox(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) Long apartmentId,
        @RequestParam(required = false) RentalRequest.Status status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) Long propertyId) {
        return requests.ownerInbox(jwt, apartmentId, status, page, size, propertyId);
    }
    @PostMapping("/api/v1/owner/rental-requests/{id}/decisions")
    public RentalRequestResponse decide(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody RentalDecision input) {
        return requests.decide(jwt, id, input);
    }
}
