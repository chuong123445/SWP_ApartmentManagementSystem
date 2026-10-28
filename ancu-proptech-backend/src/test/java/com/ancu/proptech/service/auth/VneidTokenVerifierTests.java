package com.ancu.proptech.service.auth;

import com.ancu.proptech.config.auth.VneidProperties;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class VneidTokenVerifierTests {
    static RSAKey key;
    VneidProperties config;
    VneidTokenVerifier verifier;
    @BeforeAll static void key() throws Exception { key=new RSAKeyGenerator(2048).keyID("test-key").generate(); }
    @BeforeEach void setup() {
        config=new VneidProperties();config.setEnabled(true);config.setIssuer("https://issuer.invalid/");
        config.setClientId("client");config.setAudience("api");
        var http=new RestTemplate();var server=MockRestServiceServer.bindTo(http).build();
        server.expect(requestTo("https://issuer.invalid/.well-known/jwks.json"))
                .andRespond(withSuccess(new JWKSet(key.toPublicJWK()).toString(),MediaType.APPLICATION_JSON));
        verifier=new VneidTokenVerifier(config,http);
    }
    String signed(Map<String,Object> changes) {
        var builder=JwtClaimsSet.builder().issuer(config.getIssuer()).subject("auth0|citizen").audience(List.of("api"))
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).claim("azp","client")
                .claim(VneidTokenVerifier.NS+"source",VneidTokenVerifier.SOURCE)
                .claim(VneidTokenVerifier.NS+"connection",config.getConnection());
        changes.forEach(builder::claim);
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key))).encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(key.getKeyID()).build(),builder.build())).getTokenValue();
    }
    @Test void verifiesActualRsaSignatureAndClaims() { assertEquals("auth0|citizen",verifier.decode(signed(Map.of())).getSubject()); }
    @Test void rejectsWrongIssuer(){assertThrows(JwtException.class,()->verifier.decode(signed(Map.of("iss","https://other.invalid/"))));}
    @Test void rejectsWrongAudience(){assertThrows(JwtException.class,()->verifier.decode(signed(Map.of("aud",List.of("other-api")))));}
    @Test void rejectsWrongClient(){assertThrows(JwtException.class,()->verifier.decode(signed(Map.of("azp","other-client"))));}
    @Test void rejectsWrongConnection(){assertThrows(JwtException.class,()->verifier.decode(signed(Map.of(VneidTokenVerifier.NS+"connection","other"))));}
    @Test void rejectsWrongSource(){assertThrows(JwtException.class,()->verifier.decode(signed(Map.of(VneidTokenVerifier.NS+"source","self-declared"))));}
    @Test void rejectsExpired(){assertThrows(JwtException.class,()->verifier.decode(signed(Map.of("iat",Instant.now().minusSeconds(600),"exp",Instant.now().minusSeconds(120)))));}
    @Test void rejectsTamperedSignature(){
        String token=signed(Map.of());String[] parts=token.split("\\.");
        parts[2]=(parts[2].startsWith("A")?"B":"A")+parts[2].substring(1);
        assertThrows(JwtException.class,()->verifier.decode(String.join(".",parts)));
    }
    @Test void rejectsMissingExpiry(){
        var jwt=Jwt.withTokenValue("test").header("alg","RS256").subject("auth0|test").audience(List.of("api"))
                .claim("azp","client").claim(VneidTokenVerifier.NS+"source",VneidTokenVerifier.SOURCE)
                .claim(VneidTokenVerifier.NS+"connection",config.getConnection()).build();
        assertTrue(VneidTokenVerifier.claimsValidator(config).validate(jwt).hasErrors());
    }
    @Test void disabledRejectsWithoutNetwork(){config.setEnabled(false);assertThrows(JwtException.class,()->new VneidTokenVerifier(config).decode("token"));}
    @Test void rejectsNonHttpsConfiguration(){config.setIssuer("http://issuer.invalid/");assertThrows(IllegalStateException.class,()->new VneidTokenVerifier(config));}
}
