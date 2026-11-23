package com.ancu.proptech.service.contract;

import com.ancu.proptech.dto.auth.ActionOtpDtos.Challenge;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.service.auth.ActionOtpService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.Arrays;

/** Test-only signature OTP switch. Account verification and password recovery do not use it. */
@Service
public class SigningOtpPolicy {
    private final ActionOtpService otp;
    private final Environment environment;
    private final boolean enabled;

    public SigningOtpPolicy(ActionOtpService otp, Environment environment,
            @Value("${app.signing-otp.enabled:true}") boolean enabled) {
        this.otp=otp; this.environment=environment; this.enabled=enabled;
    }

    public boolean required() {
        String[] profiles=environment.getActiveProfiles();
        if(profiles.length==0)profiles=environment.getDefaultProfiles();
        boolean testOnly=profiles.length>0 && Arrays.stream(profiles)
                .allMatch(profile->profile.equals("local")||profile.equals("test"));
        return enabled || !testOnly;
    }

    public Challenge issue(Long actorId,String purpose,String binding) {
        if(signingPurpose(purpose)&&!required())throw new ApiException(HttpStatus.CONFLICT,"SIGNING_OTP_DISABLED",
                "OTP ký đang tắt trong chế độ kiểm thử. Tải lại trang để ký trực tiếp.");
        return otp.issue(actorId,purpose,binding);
    }

    public void consume(Long actorId,String purpose,String binding,String challengeId,String code) {
        if(!signingPurpose(purpose)||required())otp.consume(actorId,purpose,binding,challengeId,code);
    }

    private static boolean signingPurpose(String purpose) {
        return ActionOtpService.CONTRACT.equals(purpose)||ActionOtpService.HANDOVER.equals(purpose);
    }
}
