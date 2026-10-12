package com.ancu.proptech.service.auth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
@Component
public class OtpHasher {
    private final byte[] secret;
    public OtpHasher(@Value("${app.auth.otp-secret:}") String configured){byte[] bytes;try{bytes=Base64.getDecoder().decode(configured);}catch(IllegalArgumentException e){bytes=new byte[0];}secret=bytes;}
    public boolean isConfigured(){return secret.length>=32;}
    public String hash(UUID account,UUID challenge,String code){
        if(!isConfigured())throw new IllegalStateException("Configure a persistent OTP secret with 32+ random bytes.");
        try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret,"HmacSHA256"));return HexFormat.of().formatHex(mac.doFinal((account+":"+challenge+":"+code).getBytes(StandardCharsets.UTF_8)));}catch(java.security.GeneralSecurityException e){throw new IllegalStateException(e);}
    }
    public boolean matches(String stored,UUID account,UUID challenge,String code){return MessageDigest.isEqual(stored.getBytes(StandardCharsets.US_ASCII),hash(account,challenge,code).getBytes(StandardCharsets.US_ASCII));}
}
