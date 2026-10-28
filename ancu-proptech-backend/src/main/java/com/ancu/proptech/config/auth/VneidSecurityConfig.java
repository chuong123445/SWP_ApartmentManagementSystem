package com.ancu.proptech.config.auth;

import com.ancu.proptech.service.auth.VneidTokenVerifier;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class VneidSecurityConfig {
    @Bean @Order(1)
    SecurityFilterChain vneidSecurity(HttpSecurity http, VneidTokenVerifier verifier,
            CookieCsrfTokenRepository csrf, CorsConfigurationSource cors) throws Exception {
        http.securityMatcher("/api/v1/auth/vneid-login")
                .cors(c -> c.configurationSource(cors))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(c -> c.disable()).formLogin(c -> c.disable()).httpBasic(c -> c.disable()).logout(c -> c.disable())
                .csrf(c -> c.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .withObjectPostProcessor(enforceCsrf(request -> "POST".equals(request.getMethod()))))
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .oauth2ResourceServer(o -> o.jwt(j -> j.decoder(verifier::decode))
                        .authenticationEntryPoint((request,response,error)->{
                            response.setStatus(401);response.setContentType("application/json;charset=UTF-8");response.setHeader("Cache-Control","no-store");
                            response.getWriter().write("{\"code\":\"VNEID_TOKEN_INVALID\",\"message\":\"Token Auth0 không hợp lệ hoặc đã hết hạn.\"}");
                        }));
        return http.build();
    }

    // Resource Server mặc định bỏ qua Bearer requests. Hai auth commands vẫn cần CSRF.
    static org.springframework.security.config.ObjectPostProcessor<CsrfFilter> enforceCsrf(
            org.springframework.security.web.util.matcher.RequestMatcher matcher) {
        return new org.springframework.security.config.ObjectPostProcessor<>() {
            @Override public <O extends CsrfFilter> O postProcess(O filter) {
                filter.setRequireCsrfProtectionMatcher(matcher);return filter;
            }
        };
    }
}
