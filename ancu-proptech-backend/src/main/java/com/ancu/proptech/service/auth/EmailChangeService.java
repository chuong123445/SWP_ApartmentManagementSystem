package com.ancu.proptech.service.auth;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.EmailChangeChallenge;
import com.ancu.proptech.repository.auth.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;
@Service @RequiredArgsConstructor
public class EmailChangeService {
    private final AccountService account;private final AuthService auth;private final AuthAccountRepository accounts;
    private final AuthSessionRepository sessions;private final EmailChangeChallengeRepository challenges;
    private final EmailOtpSender sender;private final OtpHasher hasher;private final SecureRandom random=new SecureRandom();
    @Transactional(readOnly=true) public EmailChallengeResponse pending(Jwt jwt){return challenges.findFirstByAccountIdOrderByCreatedAtDescIdDesc(auth.authenticate(jwt).getId()).map(this::response).orElse(null);}
    @Transactional public EmailChallengeResponse request(Jwt jwt,EmailChangeRequest input){
        var a=account.locked(jwt);account.version(a,input.getVersion());account.reauth(a,input.getCurrentPassword());
        String email=input.getEmail().strip().toLowerCase(Locale.ROOT);if(email.equals(a.getEmail())&&a.isEmailVerified())throw error(HttpStatus.CONFLICT,"CONTACT_UNCHANGED","Email hiện tại đã được xác minh.");
        if(accounts.findByEmail(email).filter(other->!other.getId().equals(a.getId())).isPresent())throw error(HttpStatus.CONFLICT,"CONTACT_IN_USE","Email đã được sử dụng.");
        Instant now=Instant.now();var previous=challenges.findFirstByAccountIdOrderByCreatedAtDescIdDesc(a.getId());
        if(previous.isPresent()&&previous.get().getCreatedAt().isAfter(now.minusSeconds(60)))throw limited();
        if(challenges.countByAccountIdAndCreatedAtAfter(a.getId(),now.minusSeconds(900))>=3)throw limited();
        if(!sender.isConfigured()||!hasher.isConfigured())throw error(HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","OTP email chưa được cấu hình đầy đủ hoặc SMTP chưa khả dụng.");
        String code=String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));sender.send(email,code);
        account.invalidate(a.getId());var c=new EmailChangeChallenge();c.setAccount(a);c.setTargetEmail(email);c.setAccountVersion(a.getVersion());c.setCodeHash("");c.setCreatedAt(now);c.setExpiresAt(now.plusSeconds(600));challenges.saveAndFlush(c);c.setCodeHash(hasher.hash(a.getId(),c.getId(),code));return response(challenges.saveAndFlush(c));
    }
    @Transactional(noRollbackFor=AuthException.class) public ProfileResponse confirm(Jwt jwt,Long id,EmailChangeConfirm input){
        var a=account.locked(jwt);var c=challenges.findByIdAndAccountId(id,a.getId()).orElseThrow(()->error(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy yêu cầu xác minh của bạn."));
        Instant now=Instant.now();if(c.getUsedAt()!=null||c.getInvalidatedAt()!=null)throw error(HttpStatus.BAD_REQUEST,"OTP_NOT_ACTIVE","Mã đã được sử dụng hoặc thay thế.");
        if(!c.getExpiresAt().isAfter(now))throw error(HttpStatus.BAD_REQUEST,"OTP_EXPIRED","Mã đã hết hạn. Hãy yêu cầu mã mới.");
        if(c.getAccountVersion()!=a.getVersion()){c.setInvalidatedAt(now);throw error(HttpStatus.CONFLICT,"VERSION_CONFLICT","Tài khoản đã thay đổi. Hãy yêu cầu mã mới.");}
        if(!hasher.isConfigured())throw error(HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","OTP chưa được cấu hình.");
        if(!hasher.matches(c.getCodeHash(),a.getId(),id,input.getCode())){c.setAttempts(c.getAttempts()+1);if(c.getAttempts()>=5)c.setInvalidatedAt(now);throw error(HttpStatus.BAD_REQUEST,c.getAttempts()>=5?"OTP_ATTEMPTS_EXCEEDED":"OTP_INVALID","Mã OTP không hợp lệ.");}
        if(accounts.findByEmail(c.getTargetEmail()).filter(other->!other.getId().equals(a.getId())).isPresent()){c.setInvalidatedAt(now);throw error(HttpStatus.CONFLICT,"CONTACT_IN_USE","Email đã được sử dụng.");}
        a.setEmail(c.getTargetEmail());a.setEmailVerified(true);account.recompute(a);c.setUsedAt(now);account.invalidate(a.getId());accounts.flush();var result=account.response(a);sessions.revokeAll(a.getId(),now);return result;
    }
    private static AuthException limited(){return error(HttpStatus.TOO_MANY_REQUESTS,"RATE_LIMITED","Chờ ít nhất 60 giây; tối đa 3 email OTP trong 15 phút.");}
    private EmailChallengeResponse response(EmailChangeChallenge c){String state=c.getUsedAt()!=null?"USED":c.getInvalidatedAt()!=null?"INVALIDATED":!c.getExpiresAt().isAfter(Instant.now())?"EXPIRED":"PENDING";return new EmailChallengeResponse(c.getId(),c.getTargetEmail().replaceFirst("^(.{1,2}).*(@.*)$","$1***$2"),c.getExpiresAt(),state);}
}
