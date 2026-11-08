package com.ancu.proptech.controller.rental;
import static com.ancu.proptech.dto.rental.SelectionCancellationDtos.*;
import com.ancu.proptech.service.rental.SelectionCancellationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
@RestController @RequiredArgsConstructor public class SelectionCancellationController {
 private final SelectionCancellationService service;
 @GetMapping("/api/v1/rental-requests/{id}/cancellation") public ResponseEntity<View> get(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.get(jwt,id));}
 @PostMapping("/api/v1/rental-requests/{id}/cancellation/actions") public ResponseEntity<View> act(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Command input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.act(jwt,id,input));}
}
