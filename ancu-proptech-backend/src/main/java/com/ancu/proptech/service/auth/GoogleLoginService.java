package com.ancu.proptech.service.auth;

import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class GoogleLoginService {
    private final AuthAccountRepository accounts;
    private final PasswordEncoder passwords;
    private final AuthService auth;
    private final String clientId;
    private final JwtDecoder decoder;

    public GoogleLoginService(AuthAccountRepository accounts, PasswordEncoder passwords, AuthService auth,
            @Value("${app.auth.google-client-id:${GOOGLE_CLIENT_ID:}}") String clientId) {
        this.accounts = accounts;
        this.passwords = passwords;
        this.auth = auth;
        this.clientId = clientId;
        NimbusJwtDecoder google = NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
        OAuth2TokenValidator<Jwt> claims = jwt ->
                Set.of("https://accounts.google.com", "accounts.google.com").contains(jwt.getIssuer().toString())
                && jwt.getAudience().contains(clientId)
                && Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))
                && jwt.getSubject() != null && !jwt.getSubject().isBlank()
                && jwt.getExpiresAt() != null
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        google.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), claims));
        this.decoder = google;
    }

    @Transactional
    public AuthService.LoginResult login(String credential) {
        Jwt token=decodeCredential(credential);
        AuthAccount account = accounts.findByGoogleSubject(token.getSubject()).orElse(null);
        if (account == null) {
            String email = token.getClaimAsString("email");
            if (email == null || email.length() > 254 || !email.contains("@"))
                throw new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN", "Google chưa cung cấp email hợp lệ.");
            email = email.trim().toLowerCase(Locale.ROOT);
            if (accounts.findByEmail(email).isPresent())
                throw new AuthException(HttpStatus.CONFLICT, "GOOGLE_ACCOUNT_EXISTS",
                        "Email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu.");
            account = new AuthAccount();
            account.setEmail(email);
            account.setGoogleSubject(token.getSubject());
            String name = token.getClaimAsString("name");
            if (name == null || name.isBlank()) name = email;
            account.setFullName(name.substring(0, Math.min(name.length(), 100)));
            account.setPasswordHash(null);
            account.setLocalPasswordEnabled(false);
            account.setRole(AuthAccount.Role.CUSTOMER);
            account.setStatus(AuthAccount.Status.ACTIVE);
            account.setEmailVerified(true);
            account.setContactVerified(true);
            accounts.saveAndFlush(account);
        }
        return auth.googleLogin(account);
    }
    public boolean isConfigured(){return !clientId.isBlank();}
    public Jwt decodeCredential(String credential) {
        if (clientId.isBlank()) throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE,
                "GOOGLE_NOT_CONFIGURED", "Đăng nhập Google chưa được cấu hình.");
        Jwt token;
        try { token = decoder.decode(credential); }
        catch (RuntimeException error) { throw new AuthException(HttpStatus.UNAUTHORIZED,
                "INVALID_GOOGLE_TOKEN", "Không thể xác thực Google. Vui lòng thử lại."); }
        return token;
    }

}
