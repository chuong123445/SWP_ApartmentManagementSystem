package com.ancu.proptech.controller.payment;

import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.payment.SettlementDtos.*;
import com.ancu.proptech.dto.payment.SepayDtos.Connection;
import com.ancu.proptech.model.payment.OwnerWithdrawal.Status;
import com.ancu.proptech.service.payment.SettlementService;
import com.ancu.proptech.service.payment.SepayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.ancu.proptech.exception.common.ApiException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class SettlementController {
    private final SettlementService service;
    private final SepayService sepay;

    @GetMapping("/api/v1/owner/settlements")
    public ResponseEntity<Wallet> wallet(@AuthenticationPrincipal Jwt jwt) {
        return privateResponse(service.wallet(jwt));
    }

    @PostMapping(value = "/api/v1/owner/settlements/withdrawal-qr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DestinationPreview> previewDestination(@AuthenticationPrincipal Jwt jwt,
            @RequestPart("file") MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 1_000_000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_QR", "Chọn ảnh VietQR có kích thước tối đa 1 MB.");
        }
        return privateResponse(service.previewDestination(jwt, file.getBytes()));
    }

    @GetMapping("/api/v1/owner/settlements/withdrawals")
    public ResponseEntity<PageResponse<Withdrawal>> own(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return privateResponse(service.ownWithdrawals(jwt, page, size));
    }

    @PostMapping("/api/v1/owner/settlements/withdrawals")
    public ResponseEntity<Withdrawal> request(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Request body) {
        return privateResponse(service.request(jwt, body));
    }

    @PostMapping("/api/v1/owner/settlements/withdrawals/{id}/actions")
    public ResponseEntity<Withdrawal> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody Decision body) {
        return privateResponse(service.decide(jwt, id, body, false));
    }

    @GetMapping("/api/v1/admin/settlements/connection")
    public ResponseEntity<Connection> connection(@AuthenticationPrincipal Jwt jwt) {
        return privateResponse(sepay.platformConfig(jwt));
    }

    @GetMapping("/api/v1/admin/settlements/withdrawals")
    public ResponseEntity<PageResponse<Withdrawal>> admin(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Status status, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return privateResponse(service.adminWithdrawals(jwt, status, page, size));
    }

    @PostMapping("/api/v1/admin/settlements/withdrawals/{id}/actions")
    public ResponseEntity<Withdrawal> decide(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody Decision body) {
        return privateResponse(service.decide(jwt, id, body, true));
    }

    private static <T> ResponseEntity<T> privateResponse(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
