package com.ancu.proptech.service.auth;

import com.ancu.proptech.dto.auth.ActionOtpDtos.*;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;

@Service @RequiredArgsConstructor
public class ActionOtpService {
    public static final String CONTRACT="SIGN_CONTRACT", HANDOVER="SIGN_HANDOVER", RESET="PASSWORD_RESET";
    private final AuthAccountRepository accounts;
    private final ActionOtpChallengeRepository challenges;
    private final EmailOtpSender sender;
    private final OtpHasher hasher;
    private final EntityManager entities;
    private final SecureRandom random=new SecureRandom();

    @Transactional
    public Challenge issue(Long accountId,String purpose,String binding) {
        var account=accounts.findForIdentityUpdate(accountId).orElseThrow(ActionOtpService::invalid);
        entities.refresh(account,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        requireAvailable(account);
        if(RESET.equals(purpose)&&!account.isLocalPasswordEnabled())throw invalid();
        requireConfigured();
        Instant now=Instant.now();
        var previous=challenges.findFirstByAccountIdAndPurposeOrderByCreatedAtDesc(accountId,purpose);
        if(previous.filter(c->c.getCreatedAt().isAfter(now.minusSeconds(60))).isPresent()
                ||challenges.countByAccountIdAndPurposeAndCreatedAtAfter(accountId,purpose,now.minusSeconds(900))>=3){
            if(RESET.equals(purpose))return new Challenge(UUID.randomUUID().toString(),mask(account.getEmail()),now.plusSeconds(600));
            throw error(HttpStatus.TOO_MANY_REQUESTS,"OTP_RATE_LIMITED","Chờ 60 giây giữa các lần gửi, tối đa 3 mã trong 15 phút.");
        }
        String code=String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));
        var challenge=new ActionOtpChallenge();
        challenge.setId(UUID.randomUUID().toString());challenge.setAccountId(accountId);challenge.setPurpose(purpose);
        challenge.setTargetEmail(account.getEmail());challenge.setAccountVersion(account.getVersion());
        challenge.setBindingHash(binding);challenge.setCodeHash(hasher.hash("action:"+challenge.getId(),code));
        challenge.setCreatedAt(now);challenge.setExpiresAt(now.plusSeconds(600));
        sender.sendAction(account.getEmail(),code,purpose);
        challenges.findByAccountIdAndPurposeAndUsedAtIsNullAndInvalidatedAtIsNull(accountId,purpose).forEach(c->c.setInvalidatedAt(now));
        challenges.saveAndFlush(challenge);
        return new Challenge(challenge.getId(),mask(account.getEmail()),challenge.getExpiresAt());
    }

    // Called inside the business transaction. A rejected code must persist its attempt counter.
    public void consume(Long accountId,String purpose,String binding,String id,String code) {
        var challenge=locked(accountId,id,purpose);
        if(!Objects.equals(binding,challenge.getBindingHash()))throw invalid();
        verifyCode(challenge,code);challenge.setUsedAt(Instant.now());challenges.flush();
    }
    public ActionOtpChallenge locked(Long accountId,String id,String purpose) {
        var account=accounts.findForIdentityUpdate(accountId).orElseThrow(ActionOtpService::invalid);
        entities.refresh(account,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        requireAvailable(account);
        var challenge=challenges.findById(id==null?"":id).orElseThrow(ActionOtpService::invalid);
        entities.refresh(challenge);
        if(!accountId.equals(challenge.getAccountId())||!purpose.equals(challenge.getPurpose())
                ||challenge.getUsedAt()!=null||challenge.getInvalidatedAt()!=null)throw invalid();
        if(challenge.getAccountVersion()!=account.getVersion()||!challenge.getTargetEmail().equals(account.getEmail())){
            challenge.setInvalidatedAt(Instant.now());throw invalid();
        }
        if(!challenge.getExpiresAt().isAfter(Instant.now()))throw error(HttpStatus.BAD_REQUEST,"OTP_EXPIRED","Mã đã hết hạn. Hãy gửi lại mã.");
        return challenge;
    }
    public void verifyCode(ActionOtpChallenge challenge,String code) {
        requireConfigured();
        if(challenge.getVerifiedAt()!=null)throw invalid();
        String expected=hasher.hash("action:"+challenge.getId(),code==null?"":code);
        if(!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),challenge.getCodeHash().getBytes(StandardCharsets.US_ASCII))){
            challenge.setAttempts(challenge.getAttempts()+1);
            if(challenge.getAttempts()>=5)challenge.setInvalidatedAt(Instant.now());
            challenges.flush();
            throw error(HttpStatus.BAD_REQUEST,"OTP_INVALID","Mã OTP không đúng hoặc đã vượt số lần thử. Hãy kiểm tra mã hoặc gửi lại.");
        }
    }
    public void requireConfigured(){
        if(!sender.isConfigured()||!hasher.isConfigured())throw error(HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","Chưa gửi được OTP email. Vui lòng thử lại sau.");
    }
    public static void requireAvailable(AuthAccount account){
        if(account.getDeletedAt()!=null||account.getStatus()==AuthAccount.Status.LOCKED||account.getStatus()==AuthAccount.Status.INACTIVE)throw invalid();
    }
    public static String binding(Long id,String version,String contentHash,String signature){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((id+":"+version+":"+contentHash+":"+signature).getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    public static String mask(String email){return email.replaceFirst("^(.{1,2}).*(@.*)$","$1***$2");}
    public static com.ancu.proptech.exception.auth.AuthException invalid(){return error(HttpStatus.BAD_REQUEST,"OTP_NOT_ACTIVE","Mã xác nhận không hợp lệ hoặc đã được sử dụng. Hãy yêu cầu mã mới.");}
}
