package com.ancu.proptech.service.auth;
import com.ancu.proptech.config.auth.VneidProperties;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;
@Service @RequiredArgsConstructor
public class AccountReauthenticationService {
    private final AuthService auth;
    private final AccountReauthenticationRepository proofs;
    private final ExternalIdentityRepository identities;
    private final ExternalReauthenticationVerifier verifier;
    private final VneidProperties vneid;
    private final GoogleLoginService google;
    private final EntityManager em;
    private final SecureRandom random=new SecureRandom();
    public record Capabilities(boolean passwordAvailable,List<String> providers) {}
    public record Challenge(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,String nonce,Instant expiresAt) {}
    public record Proof(String proof,Instant expiresAt) {}
    @Transactional(readOnly=true) public Capabilities capabilities(Jwt jwt){return capabilities(auth.authenticate(jwt));}
    public Capabilities capabilities(AuthAccount account){
        var providers=new ArrayList<String>();
        if(vneid.isEnabled()&&identities.findById(account.getId()).filter(i->vneid.getIssuer().equals(i.getIssuer())&&"VERIFIED".equals(i.getVerificationStatus())).isPresent())providers.add("AUTH0");
        if(google.isConfigured()&&account.getGoogleSubject()!=null)providers.add("GOOGLE");
        return new Capabilities(account.getPasswordHash()!=null&&account.isLocalPasswordEnabled(),List.copyOf(providers));
    }
    @Transactional public Challenge begin(Jwt jwt,AccountReauthentication.Purpose purpose){
        var a=locked(jwt);
        if(capabilities(a).providers().isEmpty())throw error(HttpStatus.CONFLICT,"REAUTH_PROVIDER_UNAVAILABLE","Tài khoản chưa có phương thức đăng nhập bên ngoài khả dụng. Dùng mật khẩu An Cư hiện tại.");
        Instant now=Instant.now();
        if(proofs.countByAccountIdAndCreatedAtAfter(a.getId(),now.minusSeconds(900))>=10)throw error(HttpStatus.TOO_MANY_REQUESTS,"RATE_LIMITED","Bạn đã yêu cầu xác thực lại nhiều lần. Hãy thử lại sau.");
        String nonce=secret();var challenge=new AccountReauthentication();challenge.setAccountId(a.getId());challenge.setSessionId(session(jwt));challenge.setAccountVersion(a.getVersion());challenge.setPurpose(purpose);challenge.setNonceHash(hash(nonce));challenge.setCreatedAt(now);challenge.setExpiresAt(now.plusSeconds(300));proofs.saveAndFlush(challenge);
        return new Challenge(challenge.getId(),nonce,challenge.getExpiresAt());
    }
    @Transactional(noRollbackFor=AuthException.class) public Proof confirm(Jwt jwt,Long id,ReauthenticationConfirm input){
        var a=locked(jwt);var challenge=proofs.findById(id).orElseThrow(AccountReauthenticationService::invalid);
        check(challenge,a,jwt);
        if(challenge.getConfirmedAt()!=null||challenge.getAttempts()>=5)throw invalid();
        challenge.setAttempts(challenge.getAttempts()+1);
        if(!capabilities(a).providers().contains(input.getProvider()))throw invalid();
        Jwt token;
        try{token=verifier.decode(input.getProvider(),input.getCredential());}catch(RuntimeException e){throw invalid();}
        Instant now=Instant.now();
        // Token phải được cấp sau khi bắt đầu thao tác, còn hạn và thuộc đúng liên kết đã lưu.
        if(token.getIssuedAt()==null||token.getIssuedAt().isBefore(challenge.getCreatedAt().minusSeconds(2))||token.getIssuedAt().isAfter(now.plusSeconds(30))
                ||token.getExpiresAt()==null||!token.getExpiresAt().isAfter(now))throw invalid();
        if("AUTH0".equals(input.getProvider())){
            var identity=identities.findById(a.getId()).orElseThrow(AccountReauthenticationService::invalid);
            if(!identity.getSubject().equals(token.getSubject())||token.getIssuer()==null||!identity.getIssuer().equals(token.getIssuer().toString()))throw invalid();
            // prompt=login không đủ: kiểm tra auth_time có chữ ký từ ID token max_age=0.
            Object raw=token.getClaims().get("auth_time");
            if(!(raw instanceof Number value))throw invalid();
            long time=value.longValue();if(time<challenge.getCreatedAt().minusSeconds(2).getEpochSecond()||time>now.plusSeconds(30).getEpochSecond())throw invalid();
        }else if(!Objects.equals(a.getGoogleSubject(),token.getSubject())||!challenge.getNonceHash().equals(hash(token.getClaimAsString("nonce"))))throw invalid();
        String credentialHash=hash(input.getCredential());if(proofs.existsByCredentialHash(credentialHash))throw invalid();
        String raw=secret();challenge.setCredentialHash(credentialHash);challenge.setProofHash(hash(raw));challenge.setConfirmedAt(now);proofs.flush();
        return new Proof(raw,challenge.getExpiresAt());
    }
    /** Gọi trong transaction đã khóa account; quyền chỉ dùng một lần cho đúng lệnh/phiên/version. */
    public void consume(Jwt jwt,AuthAccount a,String raw,AccountReauthentication.Purpose purpose){
        if(raw==null||raw.length()>200)throw invalid();
        var challenge=proofs.findByProofHash(hash(raw)).orElseThrow(AccountReauthenticationService::invalid);check(challenge,a,jwt);
        if(challenge.getConfirmedAt()==null||challenge.getPurpose()!=purpose)throw invalid();challenge.setUsedAt(Instant.now());
    }
    private void check(AccountReauthentication c,AuthAccount a,Jwt jwt){
        if(!c.getAccountId().equals(a.getId())||!c.getSessionId().equals(session(jwt))||c.getAccountVersion()!=a.getVersion()||c.getUsedAt()!=null||!c.getExpiresAt().isAfter(Instant.now()))throw invalid();
    }
    private AuthAccount locked(Jwt jwt){var a=auth.authenticate(jwt);em.refresh(a,LockModeType.PESSIMISTIC_WRITE);if(a.getStatus()==AuthAccount.Status.LOCKED||a.getStatus()==AuthAccount.Status.INACTIVE)throw invalid();return a;}
    private Long session(Jwt jwt){return Long.valueOf(jwt.getClaimAsString("sid"));}
    private String secret(){byte[] bytes=new byte[32];random.nextBytes(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);}
    private static String hash(String raw){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Objects.toString(raw,"").getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private static AuthException invalid(){return error(HttpStatus.FORBIDDEN,"REAUTHENTICATION_REQUIRED","Xác thực lại không hợp lệ, đã dùng hoặc hết hạn. Hãy bắt đầu lại bằng đúng tài khoản đã liên kết.");}
}
