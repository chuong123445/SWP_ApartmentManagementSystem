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
    private final RegistrationService registration;
    private final com.ancu.proptech.service.auth.VneidService vneid;
    private final com.ancu.proptech.config.auth.VneidProperties vneidConfig;
    private final CookieCsrfTokenRepository csrfRepository;
    @Value("${app.auth.secure-cookie:true}") private boolean secureCookie;

    @GetMapping("/api/v1/auth/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @GetMapping("/api/v1/auth/vneid-config")
    public ResponseEntity<?> vneidConfig() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of(
                "enabled",vneidConfig.isEnabled(),"issuer",vneidConfig.getIssuer(),
                "clientId",vneidConfig.getClientId(),"audience",vneidConfig.getAudience(),"connection",vneidConfig.getConnection()));
    }

    @PostMapping("/api/v1/auth/vneid-login")
    public ResponseEntity<TokenResponse> vneidLogin(@AuthenticationPrincipal Jwt jwt,
            HttpServletRequest http,HttpServletResponse response) {
        var result=vneid.login(jwt);
        setRefreshCookie(response,result.refreshToken(),result.refreshMaxAge());
        csrfRepository.saveToken(null,http,response);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result.tokens());
    }

    @PostMapping("/api/v1/me/verifications/vneid")
    public ResponseEntity<AuthUserResponse> verifyVneid(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody com.ancu.proptech.dto.auth.VneidVerificationRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(vneid.verifySelf(jwt,request.getAuth0AccessToken()));
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
