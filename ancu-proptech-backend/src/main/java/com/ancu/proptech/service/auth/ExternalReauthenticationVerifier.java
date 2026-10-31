package com.ancu.proptech.service.auth;
import com.ancu.proptech.config.auth.VneidProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
/** ID token chỉ dùng cho bước xác thực lại, không dùng làm Bearer gọi API An Cư. */
@Component
public class ExternalReauthenticationVerifier {
    private final JwtDecoder auth0;
    private final GoogleLoginService google;
    @Autowired public ExternalReauthenticationVerifier(VneidProperties config,GoogleLoginService google) {
        this(config,google,httpClient());
    }
    ExternalReauthenticationVerifier(VneidProperties config,GoogleLoginService google,org.springframework.web.client.RestOperations http) {
        config.validate();this.google=google;
        if(!config.isEnabled()){auth0=t->{throw new BadJwtException("Auth0 disabled");};return;}
        var decoder=NimbusJwtDecoder.withJwkSetUri(config.getIssuer()+".well-known/jwks.json").jwsAlgorithm(SignatureAlgorithm.RS256).restOperations(http).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(config.getIssuer()),jwt->
            jwt.getAudience().equals(java.util.List.of(config.getClientId()))
            &&(jwt.getClaimAsString("azp")==null||config.getClientId().equals(jwt.getClaimAsString("azp")))
            &&jwt.getExpiresAt()!=null&&jwt.getSubject()!=null&&!jwt.getSubject().isBlank()
            ?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"))));
        auth0=decoder;
    }
    private static RestTemplate httpClient(){var factory=new SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(5000);return new RestTemplate(factory);}
    public Jwt decode(String provider,String credential){
        if(credential==null||credential.length()>16384)throw new BadJwtException("Invalid credential");
        return "AUTH0".equals(provider)?auth0.decode(credential):google.decodeCredential(credential);
    }
}
