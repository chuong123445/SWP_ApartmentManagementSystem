package com.ancu.proptech.service.auth;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class AccountService {
    private final AccountVerificationPolicy verification;
    private final AuthService auth;private final AuthAccountRepository accounts;private final AuthSessionRepository sessions;
    private final EmailChangeChallengeRepository challenges;private final PasswordEncoder passwords;
    private final EmailOtpSender sender;private final OtpHasher hasher;private final EntityManager entityManager;
    @Transactional(readOnly=true) public ProfileResponse profile(Jwt jwt){return response(auth.authenticate(jwt));}
    @Transactional public ProfileResponse update(Jwt jwt,ProfileUpdate input){
        var a=locked(jwt);version(a,input.getVersion());a.setFullName(input.getFullName().strip());a.setAddress(clean(input.getAddress()));a.setBio(clean(input.getBio()));a.setDateOfBirth(input.getDateOfBirth());accounts.flush();return response(a);
    }
    @Transactional public void password(Jwt jwt,PasswordChange input){
        var a=locked(jwt);version(a,input.getVersion());reauth(a,input.getCurrentPassword());
        if(input.getNewPassword().length()<12||input.getNewPassword().getBytes(StandardCharsets.UTF_8).length>72)throw error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Mật khẩu mới cần ít nhất 12 ký tự và tối đa 72 byte UTF-8.");
        if(passwords.matches(input.getNewPassword(),a.getPasswordHash()))throw error(HttpStatus.BAD_REQUEST,"PASSWORD_REUSED","Mật khẩu mới phải khác mật khẩu hiện tại.");
        a.setPasswordHash(passwords.encode(input.getNewPassword()));invalidate(a.getId());accounts.flush();sessions.revokeAll(a.getId(),Instant.now());
    }
    @Transactional public ProfileResponse phone(Jwt jwt,PhoneChange input){
        var a=locked(jwt);version(a,input.getVersion());reauth(a,input.getCurrentPassword());String phone=normalizePhone(input.getPhone());
        // An unverified contact number must not reserve someone else's verified identity.
        if(!Objects.equals(phone,a.getPhone())){a.setPhone(phone);a.setPhoneVerified(false);recompute(a);}
        invalidate(a.getId());accounts.flush();var response=response(a);sessions.revokeAll(a.getId(),Instant.now());return response;
    }
    public AuthAccount locked(Jwt jwt){
        var a=auth.authenticate(jwt);entityManager.refresh(a,LockModeType.PESSIMISTIC_WRITE);
        if(a.getStatus()==AuthAccount.Status.LOCKED||a.getStatus()==AuthAccount.Status.INACTIVE)throw error(HttpStatus.FORBIDDEN,"ACCOUNT_UNAVAILABLE","Tài khoản không thể thực hiện thao tác này.");return a;
    }
    public void reauth(AuthAccount a,String password){if(password.getBytes(StandardCharsets.UTF_8).length>72||!passwords.matches(password,a.getPasswordHash()))throw error(HttpStatus.FORBIDDEN,"CURRENT_PASSWORD_INVALID","Mật khẩu hiện tại không đúng.");}
    public void version(AuthAccount a,long version){if(a.getVersion()!=version)throw error(HttpStatus.CONFLICT,"VERSION_CONFLICT","Thông tin tài khoản đã thay đổi. Hãy tải lại trang.");}
    public void invalidate(UUID accountId){Instant now=Instant.now();challenges.findByAccountIdAndUsedAtIsNullAndInvalidatedAtIsNull(accountId).forEach(c->c.setInvalidatedAt(now));}
    public void recompute(AuthAccount a){a.setContactVerified(verification.isVerified(a));if(a.getStatus()==AuthAccount.Status.ACTIVE&&!a.isContactVerified())a.setStatus(AuthAccount.Status.PENDING_VERIFICATION);else if(a.getStatus()==AuthAccount.Status.PENDING_VERIFICATION&&a.isContactVerified())a.setStatus(AuthAccount.Status.ACTIVE);}
    public ProfileResponse response(AuthAccount a){return new ProfileResponse(a.getId(),a.getEmail(),a.getPhone(),a.getFullName(),a.getDateOfBirth(),a.getAddress(),a.getBio(),List.of(a.getRole().name()),a.getStatus().name(),verification.isVerified(a)?"VERIFIED":"UNVERIFIED",a.isEmailVerified(),a.isPhoneVerified(),sender.isConfigured()&&hasher.isConfigured(),a.getVersion());}
    private static String clean(String text){return text==null?null:text.strip();}
    static String normalizePhone(String raw){if(raw==null||raw.isBlank())return null;String phone=raw.strip().replaceAll("[ ()-]","");if(phone.matches("0[0-9]{9,10}"))phone="+84"+phone.substring(1);if(!phone.matches("\\+[1-9][0-9]{7,14}"))throw error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Số điện thoại cần dạng +849... hoặc số Việt Nam bắt đầu 0.");return phone;}
    public static AuthException error(HttpStatus status,String code,String message){return new AuthException(status,code,message);}
}
