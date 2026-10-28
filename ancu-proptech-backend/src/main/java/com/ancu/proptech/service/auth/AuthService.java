package com.ancu.proptech.service.auth;

import com.ancu.proptech.dto.auth.AuthUserResponse;
import com.ancu.proptech.dto.auth.TokenResponse;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.auth.AuthSession;
import com.ancu.proptech.model.auth.RefreshCredential;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.auth.AuthSessionRepository;
import com.ancu.proptech.repository.auth.RefreshCredentialRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class AuthService {
    private final AccountVerificationPolicy verification;
    public static final String ISSUER = "ancu-proptech";
    public static final String AUDIENCE = "ancu-react";
    public record LoginResult(TokenResponse tokens, String refreshToken, long refreshMaxAge) {}

    private final AuthAccountRepository accounts;
    private final AuthSessionRepository sessions;
    private final RefreshCredentialRepository refreshCredentials;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final SecureRandom random = new SecureRandom();
    @Value("${app.auth.access-seconds:900}") private long accessSeconds;
    @Value("${app.auth.refresh-seconds:604800}") private long refreshSeconds;
    private String dummyHash;

    @jakarta.annotation.PostConstruct
    void prepareDummyHash() { dummyHash = passwordEncoder.encode(UUID.randomUUID().toString()); }

    @Transactional
    public LoginResult login(String email, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Mật khẩu tối đa 72 byte.");
        }
        AuthAccount account = accounts.findByEmail(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
        boolean matches = passwordEncoder.matches(password, account == null ? dummyHash : account.getPasswordHash());
        if (account == null || !matches) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
        }
        requireUsableAccount(account);
        AuthSession session = new AuthSession();
        session.setAccount(account);
        session.setExpiresAt(Instant.now().plusSeconds(refreshSeconds));
        sessions.save(session);
        return issue(session);
    }

    @Transactional
    public LoginResult googleLogin(AuthAccount account) {
        requireUsableAccount(account);
        AuthSession session = new AuthSession();
        session.setAccount(account);
        session.setExpiresAt(Instant.now().plusSeconds(refreshSeconds));
        sessions.save(session);
        return issue(session);
    }

    // Reuse revocation must commit even when the command returns an auth error.
    @Transactional(noRollbackFor = AuthException.class)
    public LoginResult refresh(String rawToken) {
        RefreshCredential credential = findRefresh(rawToken);
        AuthSession session = credential.getSession();
        if (credential.getUsedAt() != null) {
            session.setRevokedAt(Instant.now());
            throw unauthorized();
        }
        requireLiveSession(session);
        credential.setUsedAt(Instant.now());
        return issue(session);
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshCredentials.findForRotation(hash(rawToken)).ifPresent(token -> {
            token.getSession().setRevokedAt(Instant.now());
        });
    }

    @Transactional(readOnly = true)
    public AuthAccount authenticate(Jwt jwt) {
        try {
            UUID sessionId = UUID.fromString(jwt.getClaimAsString("sid"));
            AuthSession session = sessions.findById(sessionId).orElseThrow(AuthService::unauthorized);
            requireLiveSession(session);
            if (!session.getAccount().getId().toString().equals(jwt.getSubject())) throw unauthorized();
            return session.getAccount();
        } catch (IllegalArgumentException | NullPointerException e) {
            throw unauthorized();
        }
    }

    public AuthUserResponse user(AuthAccount account) {
        return new AuthUserResponse(account.getId(), account.getEmail(), account.getFullName(),
                List.of(account.getRole().name()), account.getStatus().name(),
                verification.isVerified(account) ? "VERIFIED" : "UNVERIFIED", account.getVersion());
    }

    private LoginResult issue(AuthSession session) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshCredential credential = new RefreshCredential();
        credential.setSession(session);
        credential.setTokenHash(hash(rawToken));
        refreshCredentials.save(credential);
        Instant now = Instant.now();
        Instant expires = now.plusSeconds(accessSeconds);
        if (expires.isAfter(session.getExpiresAt())) expires = session.getExpiresAt();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(ISSUER).audience(List.of(AUDIENCE))
                .subject(session.getAccount().getId().toString()).issuedAt(now).expiresAt(expires)
                .id(UUID.randomUUID().toString()).claim("sid", session.getId().toString()).build();
        String jwt = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        long cookieAge = Math.max(0, session.getExpiresAt().getEpochSecond() - now.getEpochSecond());
        return new LoginResult(new TokenResponse(jwt, "Bearer", expires.getEpochSecond() - now.getEpochSecond(),
                user(session.getAccount())), rawToken, cookieAge);
    }

    private RefreshCredential findRefresh(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) throw unauthorized();
        return refreshCredentials.findForRotation(hash(rawToken)).orElseThrow(AuthService::unauthorized);
    }

    private void requireLiveSession(AuthSession session) {
        if (session.getRevokedAt() != null || !session.getExpiresAt().isAfter(Instant.now())) throw unauthorized();
        requireUsableAccount(session.getAccount());
    }

    private void requireUsableAccount(AuthAccount account) {
        if (account.getStatus() == AuthAccount.Status.LOCKED || account.getStatus() == AuthAccount.Status.INACTIVE) {
            throw new AuthException(HttpStatus.FORBIDDEN, "ACCOUNT_UNAVAILABLE", "Tài khoản đã bị khóa hoặc ngừng hoạt động.");
        }
    }

    private static AuthException unauthorized() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
