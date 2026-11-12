package com.ancu.proptech.controller.messaging;

import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.messaging.RentalMessagingDtos.*;
import com.ancu.proptech.service.messaging.RentalMessagingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/me/conversations")
public class RentalMessagingController {
    private final RentalMessagingService messaging;

    @PostMapping("/apartments/{id}")
    public ResponseEntity<Conversation> open(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return privateResponse(messaging.open(jwt, id));
    }

    @GetMapping
    public ResponseEntity<PageResponse<Conversation>> inbox(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return privateResponse(messaging.inbox(jwt, page, size));
    }

    @PostMapping("/contracts/{id}")
    public ResponseEntity<Conversation> openForOwner(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return privateResponse(messaging.openForOwner(jwt, id));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ThreadView> thread(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
        @RequestParam(required = false) Long before, @RequestParam(required = false) Long after) {
        return privateResponse(messaging.thread(jwt, id, before, after));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<Message> send(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody Send input) {
        return privateResponse(messaging.send(jwt, id, input));
    }

    private static <T> ResponseEntity<T> privateResponse(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
