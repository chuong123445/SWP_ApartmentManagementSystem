package com.ancu.proptech.controller.auth;
import com.ancu.proptech.dto.auth.ActionOtpDtos.*;
import com.ancu.proptech.service.auth.PasswordRecoveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/auth/password-recovery")
public class PasswordRecoveryController {
    private final PasswordRecoveryService service;
    @PostMapping public ResponseEntity<Challenge> request(@Valid @RequestBody EmailInput input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.request(input));}
    @PostMapping("/verify") public ResponseEntity<Proof> verify(@Valid @RequestBody VerifyInput input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.verify(input));}
    @PostMapping("/reset") public ResponseEntity<Void> reset(@Valid @RequestBody ResetInput input){service.reset(input);return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();}
}
