package com.ancu.proptech.service.auth;

import com.ancu.proptech.config.auth.VneidProperties;
import com.ancu.proptech.dto.auth.AuthUserResponse;
import com.ancu.proptech.dto.auth.AccountVerificationResponse;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.format.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import static com.ancu.proptech.service.auth.AccountService.error;

@Service @RequiredArgsConstructor
public class VneidService {
    private final AuthAccountRepository accounts;
    private final ExternalIdentityRepository identities;
    private final AuthService auth;
    private final VneidTokenVerifier verifier;
    private final VneidProperties config;
    private final VneidLinkConfirmationStore confirmations;
    private final jakarta.persistence.EntityManager entityManager;
    private final Map<String, Window> attempts = new ConcurrentHashMap<>();
    private record Window(long minute, int count) {}

    @Transactional(readOnly=true)
    public AccountVerificationResponse verificationStatus(Jwt internal) {
        var account = auth.authenticate(internal);
        var vneid = identities.findById(account.getId())
                .filter(identity -> "VERIFIED".equals(identity.getVerificationStatus()))
                .map(identity -> new AccountVerificationResponse.Vneid("VERIFIED", identity.getVerifiedAt(),
                        new AccountVerificationResponse.Citizen(identity.getDocumentNumber(), identity.getLegalName(),
                                identity.getDateOfBirth(), identity.getGender(), identity.getAddress(), identity.getPhoneNumber(),
                                identity.getDocumentIssueDate(),identity.getDocumentIssuePlace(),identity.getPermanentAddress())))
                .orElseGet(() -> new AccountVerificationResponse.Vneid("UNVERIFIED", null, null));
        return new AccountVerificationResponse(account.isEmailVerified(), vneid);
    }

    @Transactional
    public AuthService.LoginResult login(Jwt external) {
        requireEnabled();limit(external.getSubject());
        var existing = identities.findByIssuerAndSubject(config.getIssuer(), external.getSubject());
        if (existing.isPresent()) {
            var account = accounts.findForIdentityUpdate(existing.get().getAccountId()).orElseThrow();
            requireUsable(account);
            supplement(existing.get(), external);
            return auth.createSession(account);
        }
        var identity = identity(external);
        String email = text(external, "email", 254).toLowerCase(Locale.ROOT);
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw invalidClaims();
        if (accounts.findByEmail(email).isPresent())
            throw error(HttpStatus.CONFLICT,"VNEID_ACCOUNT_LINK_REQUIRED","Email đã có tài khoản. Hãy đăng nhập tài khoản đó để liên kết VNeID.");
        if (identities.existsByDocumentNumber(identity.getDocumentNumber())) throw conflict();
        var account = new AuthAccount();
        account.setEmail(email);account.setFullName(identity.getLegalName());
        account.setDateOfBirth(identity.getDateOfBirth());account.setAddress(identity.getAddress());
        account.setRole(AuthAccount.Role.CUSTOMER);account.setStatus(AuthAccount.Status.ACTIVE);
        accounts.saveAndFlush(account);
        identity.setAccountId(account.getId());identities.saveAndFlush(identity);account.setIdentityVerified(true);accounts.saveAndFlush(account);
        account.setContactVerified(true);
        return auth.createSession(account);
    }

    public record LinkAttempt(AuthUserResponse user, com.ancu.proptech.dto.auth.VneidNameConfirmation confirmation) {}

    @Transactional
    public LinkAttempt verifySelf(Jwt internal, String rawToken) {
        requireEnabled();
        var sessionAccount = auth.authenticate(internal);
        limit(sessionAccount.getId().toString());
        Jwt external;
        try { external = verifier.decode(rawToken); }
        catch (JwtException | IllegalArgumentException ex) {
            throw error(HttpStatus.UNAUTHORIZED,"VNEID_TOKEN_INVALID","Token Auth0 không hợp lệ hoặc đã hết hạn.");
        }
        var account = accounts.findForIdentityUpdate(sessionAccount.getId()).orElseThrow();
        entityManager.refresh(account);
        requireUsable(account);
        var bySubject = identities.findByIssuerAndSubject(config.getIssuer(), external.getSubject());
        if (bySubject.isPresent() && !bySubject.get().getAccountId().equals(account.getId())) throw conflict();
        var current = identities.findById(account.getId());
        if (current.isPresent()) {
            if (!current.get().getIssuer().equals(config.getIssuer()) || !current.get().getSubject().equals(external.getSubject())) throw conflict();
            supplement(current.get(),external);
            return new LinkAttempt(auth.user(account),null); // Chỉ bổ sung trường trống từ cùng định danh; không ghi đè dữ liệu đã lưu.
        }
        var identity = identity(external);
        if (identities.existsByDocumentNumber(identity.getDocumentNumber())) throw conflict();
        if (!normalizedName(account.getFullName()).equals(normalizedName(identity.getLegalName())))
            return new LinkAttempt(null,confirmations.create(account,internal,identity,external.getExpiresAt()));
        return new LinkAttempt(bind(account,identity),null);
    }

    @Transactional
    public AuthUserResponse confirmSelf(Jwt internal, String confirmationId) {
        requireEnabled();
        var sessionAccount=auth.authenticate(internal);
        limit(sessionAccount.getId().toString());
        var account=accounts.findForIdentityUpdate(sessionAccount.getId()).orElseThrow();
        entityManager.refresh(account);
        requireUsable(account);
        var pending=confirmations.take(account,internal,confirmationId);
        var identity=pending.identity();
        if(!config.getIssuer().equals(identity.getIssuer()) || identities.findById(account.getId()).isPresent()
                || identities.findByIssuerAndSubject(identity.getIssuer(),identity.getSubject()).isPresent()
                || identities.existsByDocumentNumber(identity.getDocumentNumber())) throw conflict();
        return bind(account,identity);
    }

    @Transactional(readOnly=true)
    public void cancelSelf(Jwt internal, String confirmationId) {
        var account=auth.authenticate(internal);
        confirmations.take(account,internal,confirmationId);
    }

    private AuthUserResponse bind(AuthAccount account, ExternalIdentity identity) {
        identity.setAccountId(account.getId());identities.saveAndFlush(identity);account.setIdentityVerified(true);accounts.saveAndFlush(account);
        account.setContactVerified(true);
        if (account.getStatus() == AuthAccount.Status.PENDING_VERIFICATION) account.setStatus(AuthAccount.Status.ACTIVE);
        accounts.flush();
        return auth.user(account);
    }

    static String normalizedName(String value) {
        return java.text.Normalizer.normalize(value==null?"":value,java.text.Normalizer.Form.NFC)
                .replaceAll("(?U)\\s+"," ").strip().toLowerCase(Locale.ROOT);
    }

    private ExternalIdentity identity(Jwt jwt) {
        var result = new ExternalIdentity();
        result.setIssuer(config.getIssuer());result.setSubject(jwt.getSubject());
        String number = text(jwt,"cccd_number",12);
        if (!number.matches("[0-9]{12}")) throw invalidClaims();
        result.setDocumentNumber(number);result.setLegalName(text(jwt,"full_name",100));
        try {
            result.setDateOfBirth(LocalDate.parse(text(jwt,"dob",10),DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT)));
            if (result.getDateOfBirth().isAfter(LocalDate.now())) throw invalidClaims();
        } catch (DateTimeParseException ex) { throw invalidClaims(); }
        result.setGender(text(jwt,"gender",30));result.setAddress(text(jwt,"address",300));
        VneidCitizenDetails.read(jwt,result);
        result.setSource(VneidTokenVerifier.SOURCE);result.setVerificationStatus("VERIFIED");result.setVerifiedAt(Instant.now());
        return result;
    }
    private void supplement(ExternalIdentity saved,Jwt jwt) {
        if(!VneidCitizenDetails.present(jwt))return; // Legacy tokens and frozen core evidence remain supported.
        entityManager.refresh(saved); // The account row lock serializes concurrent supplements; discard earlier cached evidence.
        if(VneidCitizenDetails.fillMissing(saved,identity(jwt)))identities.saveAndFlush(saved);
    }
    private static String text(Jwt jwt,String key,int max) {
        Object raw=jwt.getClaims().get(VneidTokenVerifier.NS+key);
        if (!(raw instanceof String value) || value.isBlank() || value.length()>max) throw invalidClaims();
        return value.strip();
    }
    private void requireEnabled() {
        if (!config.isEnabled()) throw error(HttpStatus.SERVICE_UNAVAILABLE,"VNEID_UNAVAILABLE","Đăng nhập VNeID chưa được cấu hình.");
    }
    private static void requireUsable(AuthAccount account) {
        if (account.getStatus()==AuthAccount.Status.LOCKED || account.getStatus()==AuthAccount.Status.INACTIVE)
            throw error(HttpStatus.FORBIDDEN,"ACCOUNT_UNAVAILABLE","Tài khoản đã bị khóa hoặc ngừng hoạt động.");
    }
    private void limit(String key) {
        long minute=Instant.now().getEpochSecond()/60;
        if (attempts.size()>1000) attempts.entrySet().removeIf(e -> e.getValue().minute()!=minute);
        if (attempts.size()>2000) throw rateLimited();
        Window window=attempts.compute(key,(k,v)->new Window(minute,v==null||v.minute()!=minute?1:v.count()+1));
        if (window.count()>30) throw rateLimited();
    }
    private static AuthException rateLimited(){return error(HttpStatus.TOO_MANY_REQUESTS,"RATE_LIMITED","Thao tác quá nhiều lần. Vui lòng thử lại sau một phút.");}
    private static AuthException invalidClaims(){return error(HttpStatus.BAD_REQUEST,"VNEID_CLAIMS_INVALID","Thông tin căn cước từ Auth0 thiếu hoặc không hợp lệ.");}
    private static AuthException conflict(){return error(HttpStatus.CONFLICT,"VNEID_IDENTITY_IN_USE","Danh tính đã được liên kết. Không thể tự chuyển sang tài khoản khác.");}
}
