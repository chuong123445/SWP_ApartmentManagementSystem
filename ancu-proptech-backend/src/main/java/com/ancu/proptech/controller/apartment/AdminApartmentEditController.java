package com.ancu.proptech.controller.apartment;

import com.ancu.proptech.dto.apartment.OwnerApartmentResponse;
import com.ancu.proptech.service.apartment.OwnerApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

/**
 * Admin endpoints for reviewing pending sensitive-field edits on apartments.
 * Requires ADMIN role (enforced via SecurityConfig).
 */
@RestController
@RequestMapping("/api/v1/admin/apartments")
@RequiredArgsConstructor
public class AdminApartmentEditController {

    private final OwnerApartmentService apartments;

    /**
     * List all apartments with pending sensitive-field edits awaiting admin approval.
     * GET /api/v1/admin/apartments/pending-edits
     */
    @GetMapping("/pending-edits")
    public java.util.List<OwnerApartmentResponse> listPendingEdits(@AuthenticationPrincipal Jwt jwt) {
        return apartments.listPendingEdits();
    }

    /**
     * Approve a pending sensitive-field edit: applies draft values to the live apartment record.
     * POST /api/v1/admin/apartments/{id}/pending-edit/approve
     */
    @PostMapping("/{id}/pending-edit/approve")
    public OwnerApartmentResponse approveEdit(@AuthenticationPrincipal Jwt jwt,
                                              @PathVariable UUID id) {
        // Role guard is handled by Spring Security; jwt is available for audit logging if needed.
        return apartments.applyPendingEdit(id);
    }

    /**
     * Reject a pending sensitive-field edit: discards the draft, apartment keeps current values.
     * POST /api/v1/admin/apartments/{id}/pending-edit/reject
     */
    @PostMapping("/{id}/pending-edit/reject")
    public OwnerApartmentResponse rejectEdit(@AuthenticationPrincipal Jwt jwt,
                                             @PathVariable UUID id) {
        return apartments.rejectPendingEdit(id);
    }
}
