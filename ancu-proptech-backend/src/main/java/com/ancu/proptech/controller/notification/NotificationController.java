package com.ancu.proptech.controller.notification;
import com.ancu.proptech.service.notification.NotificationService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import java.time.Instant;
@RestController @RequestMapping("/api/v1/me/notifications") @RequiredArgsConstructor
public class NotificationController {
 private final NotificationService service;
 public record ReadAll(@NotNull Instant through){}
 @GetMapping public ResponseEntity<NotificationService.Feed> list(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(jwt,page,size));}
 @PostMapping("/{id}/read") public ResponseEntity<Void> read(@AuthenticationPrincipal Jwt jwt,@PathVariable String id){service.read(jwt,id);return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();}
 @PostMapping("/read-all") public ResponseEntity<Void> readAll(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ReadAll input){service.readAll(jwt,input.through());return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();}
}
