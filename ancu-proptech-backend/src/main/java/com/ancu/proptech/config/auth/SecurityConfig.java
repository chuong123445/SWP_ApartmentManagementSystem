package com.ancu.proptech.config.auth;

import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.service.auth.AuthService;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;
import org.springframework.web.cors.*;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.*;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean SecretKey jwtKey(@Value("${app.auth.jwt-secret:}") String secret, Environment environment) {
        byte[] bytes;
        if (secret.isBlank()) {
            if (!environment.matchesProfiles("local", "test")) {
                throw new IllegalStateException("Set APP_JWT_SECRET or use the local profile for development.");
            }
            bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
        } else {
            bytes = Base64.getDecoder().decode(secret);
            if (bytes.length < 32) throw new IllegalStateException("APP_JWT_SECRET must be at least 32 random bytes, Base64 encoded.");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean JwtEncoder jwtEncoder(SecretKey key) { return new NimbusJwtEncoder(new ImmutableSecret<>(key)); }
    @Bean JwtDecoder jwtDecoder(SecretKey key) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains(AuthService.AUDIENCE)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(AuthService.ISSUER), audience));
        return decoder;
    }

    @Bean CookieCsrfTokenRepository csrfTokenRepository(@Value("${app.auth.secure-cookie:true}") boolean secure) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie.sameSite("Lax").secure(secure).path("/"));
        return repository;
    }

    @Bean CorsConfigurationSource cors(@Value("${app.auth.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}") String origins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.asList(origins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean SecurityFilterChain apiSecurity(HttpSecurity http, AuthService auth,
                                         CookieCsrfTokenRepository csrf, CorsConfigurationSource cors, com.ancu.proptech.service.auth.AccountVerificationPolicy verification) throws Exception {
        http.cors(c -> c.configurationSource(cors))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable()).logout(logout -> logout.disable())
                .csrf(c -> c.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .withObjectPostProcessor(VneidSecurityConfig.enforceCsrf(request -> !Set.of("GET", "HEAD", "OPTIONS", "TRACE").contains(request.getMethod())
                                && (request.getRequestURI().startsWith(request.getContextPath() + "/api/v1/auth/")
                                || request.getRequestURI().equals(request.getContextPath()+"/api/v1/me/verifications/vneid")
                                || request.getRequestURI().equals(request.getContextPath()+"/api/v1/me/owner-upgrade")))))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/api/v1/auth/google").permitAll()
                        .requestMatchers("/api/v1/auth/csrf", "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout", "/error").permitAll()
                        .requestMatchers("/api/v1/me/verifications", "/api/v1/me/verifications/vneid", "/api/v1/me/owner-upgrade").authenticated()
                        .requestMatchers("/api/v1/auth/vneid-config").permitAll()
                        .requestMatchers("/api/v1/me/property-images").authenticated()
                        .requestMatchers(HttpMethod.GET,"/api/v1/property-images/*").permitAll()
                        .requestMatchers("/api/v1/me").authenticated()
                        .requestMatchers("/api/v1/me/identity", "/api/v1/me/identity/documents/*").authenticated()
                        .requestMatchers("/api/v1/me/rental-properties", "/api/v1/me/rental-properties/*/evidence-files", "/api/v1/me/rental-properties/*/verification-dossiers", "/api/v1/me/property-notices").authenticated()
                        .requestMatchers("/api/v1/me/profile", "/api/v1/me/password", "/api/v1/me/phone", "/api/v1/me/email-change", "/api/v1/me/email-changes", "/api/v1/me/email-changes/*/confirm").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/apartments", "/api/v1/apartments/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/apartment/images/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/apartment/images/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/apartments/*/rental-requests").authenticated()
                        .requestMatchers("/api/v1/me/rental-requests", "/api/v1/me/rental-requests/*/cancel", "/api/v1/me/apartments/*/rental-requests", "/api/v1/owner/rental-requests", "/api/v1/owner/rental-requests/*/decisions").authenticated()
                        .requestMatchers("/api/v1/owner/apartments", "/api/v1/owner/properties", "/api/v1/owner/properties/vneid-assets", "/api/v1/owner/properties/vneid-imports").authenticated()
                        .requestMatchers("/api/v1/owner/properties/*/evidence-files", "/api/v1/owner/properties/*/verification-dossiers", "/api/v1/property-evidence-files/*", "/api/v1/admin/property-dossiers", "/api/v1/admin/property-dossiers/*", "/api/v1/admin/property-dossiers/*/decisions", "/api/v1/owner/apartments/*/publication", "/api/v1/owner/apartments/*/prices").authenticated()
                        .requestMatchers("/api/v1/owner/tenancies", "/api/v1/me/tenancies", "/api/v1/owner/contracts/*/billing-context", "/api/v1/owner/contracts/*/invoices", "/api/v1/owner/invoices", "/api/v1/owner/invoices/*/send", "/api/v1/me/invoices", "/api/v1/invoices/*").authenticated()
                        .requestMatchers("/api/v1/owner/rental-requests/*/contract-context", "/api/v1/owner/rental-requests/*/contract", "/api/v1/owner/contract-drafts", "/api/v1/me/contract-drafts", "/api/v1/contracts/*", "/api/v1/owner/contracts/*/draft").authenticated()
                        // API ký quỹ cũ chưa có ownership/provider hợp lệ: đóng mọi truy cập,
                        // kể cả Owner/Admin, thay vì chỉ kiểm tra role rồi cho đọc/sửa toàn bộ.
                        .requestMatchers("/api/trustguard/escrow", "/api/trustguard/escrow/**").denyAll()
                        .anyRequest().denyAll())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((request, response, error) -> writeError(response, 401, "UNAUTHENTICATED", "Vui lòng đăng nhập lại."))
                        .accessDeniedHandler((request, response, error) -> writeError(response, 403, "FORBIDDEN", "Bạn không có quyền hoặc thiếu mã CSRF.")))
                .oauth2ResourceServer(o -> o
                        .authenticationEntryPoint((request, response, error) -> writeError(response, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ."))
                        .jwt(j -> j.jwtAuthenticationConverter(jwt -> {
                            try {
                                AuthAccount account = auth.authenticate(jwt);
                                String role = account.getStatus() == AuthAccount.Status.ACTIVE && verification.isVerified(account)
                                        ? account.getRole().name() : "ONBOARDING";
                                return new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                            } catch (AuthException error) {
                                throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
                            }
                        })));
        return http.build();
    }

    private static void writeError(jakarta.servlet.http.HttpServletResponse response, int status, String code, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "no-store");
        response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
    }
}
