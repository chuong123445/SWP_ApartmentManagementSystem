package com.ancu.proptech.controller.auth;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.service.auth.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class AccountController {
    private final AccountService accounts;private final EmailChangeService emails;private final CookieCsrfTokenRepository csrf;
    @Value("${app.auth.secure-cookie:true}") private boolean secure;
    @GetMapping("/api/v1/me/profile") public ProfileResponse profile(@AuthenticationPrincipal Jwt jwt){return accounts.profile(jwt);}
    @PatchMapping("/api/v1/me") public ProfileResponse update(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ProfileUpdate input){return accounts.update(jwt,input);}
    @PostMapping("/api/v1/me/password") public ResponseEntity<Void> password(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody PasswordChange input,HttpServletRequest request,HttpServletResponse response){accounts.password(jwt,input);clear(request,response);return ResponseEntity.noContent().build();}
    @PostMapping("/api/v1/me/phone") public ProfileResponse phone(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody PhoneChange input,HttpServletRequest request,HttpServletResponse response){var result=accounts.phone(jwt,input);clear(request,response);return result;}
    @GetMapping("/api/v1/me/email-change") public ResponseEntity<EmailChallengeResponse> pending(@AuthenticationPrincipal Jwt jwt){var result=emails.pending(jwt);return result==null?ResponseEntity.noContent().build():ResponseEntity.ok(result);}
    @PostMapping("/api/v1/me/email-changes") public ResponseEntity<EmailChallengeResponse> email(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody EmailChangeRequest input){return ResponseEntity.status(HttpStatus.ACCEPTED).body(emails.request(jwt,input));}
    @PostMapping("/api/v1/me/email-changes/{id}/confirm") public ProfileResponse confirm(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody EmailChangeConfirm input,HttpServletRequest request,HttpServletResponse response){var result=emails.confirm(jwt,id,input);clear(request,response);return result;}
    private void clear(HttpServletRequest request,HttpServletResponse response){response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from(AuthController.REFRESH_COOKIE,"").httpOnly(true).secure(secure).sameSite("Lax").path("/api/v1/auth").maxAge(0).build().toString());csrf.saveToken(null,request,response);}
}
