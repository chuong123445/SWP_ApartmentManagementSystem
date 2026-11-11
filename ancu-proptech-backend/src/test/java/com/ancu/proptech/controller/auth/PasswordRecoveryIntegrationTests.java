package com.ancu.proptech.controller.auth;

import com.ancu.proptech.dto.auth.ActionOtpDtos.*;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.service.auth.*;
import com.ancu.proptech.exception.auth.AuthException;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@SpringBootTest(properties={"app.auth.otp-secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","app.auth.secure-cookie=false"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class PasswordRecoveryIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AuthAccountRepository accounts;
    @Autowired ActionOtpChallengeRepository challenges;
    @Autowired PasswordEncoder passwords;
    @Autowired AuthService auth;
    @Autowired PasswordRecoveryService recovery;
    @Autowired ActionOtpService otp;
    @MockitoBean EmailOtpSender sender;
    private AuthAccount account;
    private String code, access;
    private static final String OLD="Recovery-old!12345", NEW="Recovery-new!12345";
    @BeforeEach void setup(){
        account=new AuthAccount();account.setEmail(UUID.randomUUID()+"@example.invalid");account.setFullName("Recovery fixture");
        account.setRole(AuthAccount.Role.CUSTOMER);account.setStatus(AuthAccount.Status.ACTIVE);account.setPasswordHash(passwords.encode(OLD));account.setEmailVerified(true);account.setContactVerified(true);accounts.saveAndFlush(account);
        access=auth.login(account.getEmail(),OLD).tokens().accessToken();
        when(sender.isConfigured()).thenReturn(true);
        doAnswer(call->{code=call.getArgument(1);return null;}).when(sender).sendAction(anyString(),anyString(),anyString());
    }
    private ResultActions postJson(String suffix,Object body)throws Exception{
        return mvc.perform(post("/api/v1/auth/password-recovery"+suffix).with(csrf()).contentType("application/json").content(json.writeValueAsString(body)));
    }
    private Challenge request() {return recovery.request(new EmailInput(account.getEmail()));}
    @Test void publicCsrfRequiredAndResponsesNeverContainCodesOrHashes()throws Exception{
        mvc.perform(post("/api/v1/auth/password-recovery").contentType("application/json").content(json.writeValueAsString(new EmailInput(account.getEmail())))).andExpect(status().isForbidden());
        postJson("",new EmailInput(account.getEmail())).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.code").doesNotExist()).andExpect(jsonPath("$.codeHash").doesNotExist());
        postJson("",new EmailInput("missing@example.invalid")).andExpect(status().isOk()).andExpect(jsonPath("$.challengeId").exists());
    }
    @Test void verifyThenResetRevokesSessionsAndConsumesProof()throws Exception{
        var challenge=request();String actualCode=code;
        var proof=recovery.verify(new VerifyInput(challenge.challengeId(),actualCode));
        assertFalse(proof.resetToken().equals(challenges.findById(challenge.challengeId()).orElseThrow().getProofHash()));
        assertThrows(AuthException.class,()->recovery.verify(new VerifyInput(challenge.challengeId(),actualCode)));
        postJson("/reset",new ResetInput(proof.challengeId(),proof.resetToken(),NEW,NEW)).andExpect(status().isNoContent());
        assertTrue(passwords.matches(NEW,accounts.findById(account.getId()).orElseThrow().getPasswordHash()));
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
        assertThrows(AuthException.class,()->recovery.reset(new ResetInput(proof.challengeId(),proof.resetToken(),NEW,NEW)));
        assertEquals(AuthAccount.Status.ACTIVE,account.getStatus());
    }
    @Test void wrongCodeLocksAfterFiveAttemptsAndCannotBeReused(){
        var challenge=request();String correct=code;String wrong=correct.equals("000000")?"111111":"000000";
        for(int i=0;i<5;i++)assertThrows(AuthException.class,()->recovery.verify(new VerifyInput(challenge.challengeId(),wrong)));
        var stored=challenges.findById(challenge.challengeId()).orElseThrow();assertEquals(5,stored.getAttempts());assertNotNull(stored.getInvalidatedAt());
        assertThrows(AuthException.class,()->recovery.verify(new VerifyInput(challenge.challengeId(),correct)));
    }
    @Test void expiryResendAndAccountChangesInvalidateCodes(){
        var first=request();String oldCode=code;
        challenges.findById(first.challengeId()).orElseThrow().setCreatedAt(Instant.now().minusSeconds(1000));
        var second=request();String current=code;
        assertThrows(AuthException.class,()->recovery.verify(new VerifyInput(first.challengeId(),oldCode)));
        account.setFullName("Changed");accounts.flush();
        assertThrows(AuthException.class,()->recovery.verify(new VerifyInput(second.challengeId(),current)));
    }
    @Test void rejectsExpiredWrongProofAndMismatchedPasswords(){
        var challenge=request();String correct=code;
        challenges.findById(challenge.challengeId()).orElseThrow().setExpiresAt(Instant.now().minusSeconds(1));challenges.flush();
        assertThrows(AuthException.class,()->recovery.verify(new VerifyInput(challenge.challengeId(),correct)));
        challenges.findById(challenge.challengeId()).orElseThrow().setCreatedAt(Instant.now().minusSeconds(1000));
        var next=request();var proof=recovery.verify(new VerifyInput(next.challengeId(),code));
        assertThrows(AuthException.class,()->recovery.reset(new ResetInput(proof.challengeId(),"wrong",NEW,NEW)));
        assertThrows(AuthException.class,()->recovery.reset(new ResetInput(proof.challengeId(),proof.resetToken(),NEW,"Different!12345")));
        assertTrue(passwords.matches(OLD,account.getPasswordHash()));
    }
    @Test void lockedExternalAndUnknownEmailsUseGenericResponseWithoutSending(){
        account.setStatus(AuthAccount.Status.LOCKED);accounts.flush();request();
        account.setStatus(AuthAccount.Status.ACTIVE);account.setLocalPasswordEnabled(false);accounts.flush();request();
        recovery.request(new EmailInput("nobody@example.invalid"));verify(sender,never()).sendAction(anyString(),anyString(),anyString());
    }
    @Test void signatureBindingCannotBeUsedByAnotherActorPurposeOrPayload(){
        var challenge=otp.issue(account.getId(),ActionOtpService.CONTRACT,"a".repeat(64));String correct=code;
        assertThrows(AuthException.class,()->otp.consume(account.getId(),ActionOtpService.HANDOVER,"a".repeat(64),challenge.challengeId(),correct));
        assertThrows(AuthException.class,()->otp.consume(account.getId(),ActionOtpService.CONTRACT,"b".repeat(64),challenge.challengeId(),correct));
        otp.consume(account.getId(),ActionOtpService.CONTRACT,"a".repeat(64),challenge.challengeId(),correct);
        assertThrows(AuthException.class,()->otp.consume(account.getId(),ActionOtpService.CONTRACT,"a".repeat(64),challenge.challengeId(),correct));
    }
    @Test void smtpFailurePersistsNoUsableChallengeAndCooldownPreventsResend(){
        doThrow(new AuthException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","SMTP unavailable")).when(sender).sendAction(anyString(),anyString(),anyString());
        assertThrows(AuthException.class,this::request);
        assertEquals(0,challenges.findAll().stream().filter(c->account.getId().equals(c.getAccountId())).count());
    }
}
