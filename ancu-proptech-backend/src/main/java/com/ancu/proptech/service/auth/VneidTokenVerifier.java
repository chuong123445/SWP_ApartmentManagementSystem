package com.ancu.proptech.service.auth;

import com.ancu.proptech.config.auth.VneidProperties;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.client.RestOperations;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

/** Chỉ tin khóa từ issuer cấu hình, không đọc URL khóa từ token của client. */
@Component
public class VneidTokenVerifier {
    public static final String NS = "https://vneid.gov.vn/";
    public static final String SOURCE = "AUTH0_VNEID_SIMULATION";
    private final JwtDecoder decoder;
    @Autowired public VneidTokenVerifier(VneidProperties config) {
        this(config, httpClient());
    }
    VneidTokenVerifier(VneidProperties config, RestOperations http) {
        config.validate();
        if (!config.isEnabled()) {
            decoder = token -> { throw new BadJwtException("VNeID is disabled"); };
            return;
        }
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withJwkSetUri(config.getIssuer()+".well-known/jwks.json")
                .jwsAlgorithm(SignatureAlgorithm.RS256).restOperations(http).build();
        nimbus.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(config.getIssuer()), claimsValidator(config)));
        decoder = nimbus;
    }
    private static RestOperations httpClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);factory.setReadTimeout(5000);
        return new RestTemplate(factory);
    }
    public Jwt decode(String token) {
        if (token == null || token.length() > 16384) throw new BadJwtException("Invalid token size");
        return decoder.decode(token);
    }
    public static OAuth2TokenValidator<Jwt> claimsValidator(VneidProperties config) {
        return jwt -> {
            boolean valid = jwt.getExpiresAt() != null && jwt.getSubject() != null && !jwt.getSubject().isBlank()
                    && jwt.getSubject().length() <= 255 && jwt.getAudience().contains(config.getAudience())
                    && config.getClientId().equals(jwt.getClaimAsString("azp"))
                    && config.getConnection().equals(jwt.getClaimAsString(NS+"connection"))
                    && SOURCE.equals(jwt.getClaimAsString(NS+"source"));
            return valid ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        };
    }
}
