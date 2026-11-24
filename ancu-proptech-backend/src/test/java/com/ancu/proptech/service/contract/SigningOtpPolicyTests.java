package com.ancu.proptech.service.contract;

import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.service.auth.ActionOtpService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SigningOtpPolicyTests {
    @ParameterizedTest
    @CsvSource({"local,false,false","test,false,false","local+test,false,false",
            "local,true,true","test,true,true","prod,false,true","production,false,true",
            "local+prod,false,true","local+staging,false,true","default,false,true"})
    void bypassIsRestrictedToExplicitLocalOrTestProfiles(String profiles,boolean enabled,boolean expected) {
        var env=new MockEnvironment();env.setActiveProfiles(profiles.split("\\+"));
        assertEquals(expected,new SigningOtpPolicy(mock(ActionOtpService.class),env,enabled).required());
    }
    @Test void defaultLocalProfileCanBypassButAnActiveProductionProfileOverridesIt() {
        var env=new MockEnvironment();env.setDefaultProfiles("local");var policy=new SigningOtpPolicy(mock(ActionOtpService.class),env,false);
        assertFalse(policy.required());env.setActiveProfiles("prod");assertTrue(policy.required());
    }
    @Test void disabledSigningNeitherIssuesNorConsumesAnyOtp() {
        var env=new MockEnvironment();env.setActiveProfiles("local");var otp=mock(ActionOtpService.class);var policy=new SigningOtpPolicy(otp,env,false);
        assertEquals("SIGNING_OTP_DISABLED",assertThrows(ApiException.class,()->policy.issue(1L,ActionOtpService.CONTRACT,"binding")).code);
        policy.consume(1L,ActionOtpService.CONTRACT,"binding",null,null);policy.consume(1L,ActionOtpService.HANDOVER,"binding",null,null);
        verifyNoInteractions(otp);
    }
    @Test void productionStillDelegatesToTheOriginalOtpValidationWhenConfiguredFalse() {
        var env=new MockEnvironment();env.setActiveProfiles("prod");var otp=mock(ActionOtpService.class);var policy=new SigningOtpPolicy(otp,env,false);
        policy.consume(1L,ActionOtpService.CONTRACT,"binding",null,null);
        verify(otp).consume(1L,ActionOtpService.CONTRACT,"binding",null,null);
    }
    @Test void signingSwitchDoesNotBypassPasswordRecovery() {
        var env=new MockEnvironment();env.setActiveProfiles("local");var otp=mock(ActionOtpService.class);var policy=new SigningOtpPolicy(otp,env,false);
        policy.issue(1L,ActionOtpService.RESET,"binding");policy.consume(1L,ActionOtpService.RESET,"binding",null,null);
        verify(otp).issue(1L,ActionOtpService.RESET,"binding");verify(otp).consume(1L,ActionOtpService.RESET,"binding",null,null);
    }
}
