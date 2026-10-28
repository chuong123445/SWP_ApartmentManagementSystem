package com.ancu.proptech.controller.auth;

import com.ancu.proptech.dto.auth.AuthUserResponse;
import com.ancu.proptech.dto.auth.LoginRequest;
import com.ancu.proptech.dto.auth.TokenResponse;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.service.auth.AuthService;
import com.ancu.proptech.service.auth.RegistrationService;
import com.ancu.proptech.dto.auth.RegistrationRequest;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequiredArgsConstructor
public class AuthController {
    public static final String REFRESH_COOKIE = "ANCU_REFRESH";
    private final AuthService auth;
    private final com.ancu.proptech.service.auth.GoogleLoginService google;
    private final RegistrationService registration;
    private final CookieCsrfTokenRepository csrfRepository;
    @Value("${app.auth.secure-cookie:true}") private boolean secureCookie;

    @GetMapping("/api/v1/auth/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @PostMapping("/api/v1/auth/register")
    public ResponseEntity<AuthUserResponse> register(@Valid @RequestBody RegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(registration.register(request));
    }

    @PostMapping("/api/v1/auth/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request,
                                                   HttpServletRequest http, HttpServletResponse response) {
        AuthService.LoginResult result = auth.login(request.email(), request.password());
        setRefreshCookie(response, result.refreshToken(), result.refreshMaxAge());
        csrfRepository.saveToken(null, http, response);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result.tokens());
    }

    public record GoogleRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 8192) String credential) {}

    @PostMapping("/api/v1/auth/google")
    public ResponseEntity<TokenResponse> google(@Valid @RequestBody GoogleRequest request,
            HttpServletRequest http, HttpServletResponse response) {
        AuthService.LoginResult result = google.login(request.credential());
        setRefreshCookie(response, result.refreshToken(), result.refreshMaxAge());
        csrfRepository.saveToken(null, http, response);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result.tokens());
    }

    @PostMapping("/api/v1/auth/refresh")
    public ResponseEntity<TokenResponse> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String token,
                                                     HttpServletRequest http, HttpServletResponse response) {
        try {
            AuthService.LoginResult result = auth.refresh(token);
            setRefreshCookie(response, result.refreshToken(), result.refreshMaxAge());
            csrfRepository.saveToken(null, http, response);
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result.tokens());
        } catch (AuthException e) {
            setRefreshCookie(response, "", 0);
            throw e;
        }
    }

    @PostMapping("/api/v1/auth/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String token,
                                       HttpServletRequest http, HttpServletResponse response) {
        auth.logout(token);
        setRefreshCookie(response, "", 0);
        csrfRepository.saveToken(null, http, response);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @GetMapping("/api/v1/me")
    public ResponseEntity<AuthUserResponse> me(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(auth.user(auth.authenticate(jwt)));
    }

    private void setRefreshCookie(HttpServletResponse response, String value, long maxAge) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, value).httpOnly(true).secure(secureCookie)
                .sameSite("Lax").path("/api/v1/auth").maxAge(maxAge).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
