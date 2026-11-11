package com.ancu.proptech.service.auth;

import com.ancu.proptech.dto.auth.ActionOtpDtos.*;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.repository.auth.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;

@Service @RequiredArgsConstructor
public class PasswordRecoveryService {
    private final AuthAccountRepository accounts;
    private final ActionOtpChallengeRepository challenges;
    private final AuthSessionRepository sessions;
    private final ActionOtpService otp;
    private final OtpHasher hasher;
    private final PasswordEncoder passwords;
    private final AccountService accountService;

    @Transactional
    public Challenge request(EmailInput input){
        otp.requireConfigured();
        String email=input.email().strip().toLowerCase(Locale.ROOT);
        var account=accounts.findByEmail(email).orElse(null);
        if(account==null||account.getDeletedAt()!=null||!account.isLocalPasswordEnabled()
                ||account.getStatus()==com.ancu.proptech.model.auth.AuthAccount.Status.LOCKED
                ||account.getStatus()==com.ancu.proptech.model.auth.AuthAccount.Status.INACTIVE)
            return new Challenge(UUID.randomUUID().toString(),ActionOtpService.mask(email),Instant.now().plusSeconds(600));
        return otp.issue(account.getId(),ActionOtpService.RESET,"0".repeat(64));
    }
    @Transactional(noRollbackFor=AuthException.class)
    public Proof verify(VerifyInput input){
        var found=challenges.findById(input.challengeId()).orElseThrow(ActionOtpService::invalid);
        var challenge=otp.locked(found.getAccountId(),input.challengeId(),ActionOtpService.RESET);
        otp.verifyCode(challenge,input.code());
        String token=UUID.randomUUID().toString()+UUID.randomUUID().toString();
        challenge.setVerifiedAt(Instant.now());challenge.setProofHash(hasher.hash("reset:"+challenge.getId(),token));
        challenge.setExpiresAt(Instant.now().plusSeconds(600));
        challenges.flush();
        return new Proof(challenge.getId(),token,challenge.getExpiresAt());
    }
    @Transactional
    public void reset(ResetInput input){
        if(!input.newPassword().equals(input.confirmPassword()))throw error(HttpStatus.BAD_REQUEST,"PASSWORD_CONFIRMATION_MISMATCH","Mật khẩu xác nhận không khớp.");
        if(input.newPassword().length()<12||input.newPassword().getBytes(StandardCharsets.UTF_8).length>72)throw error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte UTF-8.");
        var found=challenges.findById(input.challengeId()).orElseThrow(ActionOtpService::invalid);
        var challenge=otp.locked(found.getAccountId(),input.challengeId(),ActionOtpService.RESET);
        String proof=hasher.hash("reset:"+challenge.getId(),input.resetToken());
        if(challenge.getVerifiedAt()==null||challenge.getProofHash()==null||!MessageDigest.isEqual(proof.getBytes(StandardCharsets.US_ASCII),challenge.getProofHash().getBytes(StandardCharsets.US_ASCII)))throw ActionOtpService.invalid();
        var account=accounts.findForIdentityUpdate(challenge.getAccountId()).orElseThrow(ActionOtpService::invalid);
        if(!account.isLocalPasswordEnabled())throw ActionOtpService.invalid();
        if(account.getPasswordHash()!=null&&passwords.matches(input.newPassword(),account.getPasswordHash()))throw error(HttpStatus.BAD_REQUEST,"PASSWORD_REUSED","Mật khẩu mới phải khác mật khẩu hiện tại.");
        account.setPasswordHash(passwords.encode(input.newPassword()));
        challenge.setUsedAt(Instant.now());accountService.invalidate(account.getId());
        sessions.revokeAll(account.getId(),Instant.now());accounts.flush();
    }
}
