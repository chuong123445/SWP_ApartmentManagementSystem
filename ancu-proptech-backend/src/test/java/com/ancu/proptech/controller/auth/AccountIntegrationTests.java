package com.ancu.proptech.controller.auth;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.service.auth.*;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"app.auth.otp-secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","app.auth.secure-cookie=false"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class AccountIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired EmailChangeChallengeRepository challenges;
    @Autowired AuthService auth;@Autowired PasswordEncoder encoder;
    @MockitoBean EmailOtpSender sender;
    private AuthAccount account,other;private String token,otherToken,code;
    private final String password="Account-test!12345";
    @BeforeEach void fixture(){account=account();other=account();token=auth.login(account.getEmail(),password).tokens().accessToken();otherToken=auth.login(other.getEmail(),password).tokens().accessToken();when(sender.isConfigured()).thenReturn(true);doAnswer(invocation->{code=invocation.getArgument(1);return null;}).when(sender).send(anyString(),anyString());}
    private AuthAccount account(){var a=new AuthAccount();a.setEmail("account-test-"+UUID.randomUUID()+"@example.invalid");a.setFullName("Profile test");a.setPasswordHash(encoder.encode(password));a.setRole(AuthAccount.Role.CUSTOMER);a.setStatus(AuthAccount.Status.ACTIVE);a.setContactVerified(true);a.setEmailVerified(true);return accounts.saveAndFlush(a);}
    private ResultActions post(String path,String bearer,String body)throws Exception{return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).header("Authorization","Bearer "+bearer).contentType("application/json").content(body));}
    private String emailBody(String destination,long version){return "{\"email\":\""+destination+"\",\"currentPassword\":\""+password+"\",\"version\":"+version+"}";}
    private String challenge()throws Exception{return JsonPath.read(post("/api/v1/me/email-changes",token,emailBody("new-"+UUID.randomUUID()+"@example.invalid",account.getVersion())).andExpect(status().isAccepted()).andExpect(jsonPath("$.code").doesNotExist()).andExpect(jsonPath("$.codeHash").doesNotExist()).andReturn().getResponse().getContentAsString(),"$.id");}
    @Test void profileIsPrivatePersistsAndRejectsSecurityFieldMassAssignment()throws Exception{
        mvc.perform(get("/api/v1/me/profile").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(account.getId().toString())).andExpect(jsonPath("$.passwordHash").doesNotExist());
        String body="{\"fullName\":\"Updated name\",\"address\":\"Private address\",\"bio\":\"Private bio\",\"dateOfBirth\":\"1998-01-01\",\"version\":0}";
        mvc.perform(patch("/api/v1/me").header("Authorization","Bearer "+token).contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Updated name")).andExpect(jsonPath("$.version").value(1));
        mvc.perform(patch("/api/v1/me").header("Authorization","Bearer "+token).contentType("application/json").content(body)).andExpect(status().isConflict());
        for(String field:List.of("role","email","phone","contactVerified","emailVerified","id"))mvc.perform(patch("/api/v1/me").header("Authorization","Bearer "+token).contentType("application/json").content(body.replace("\"version\":0","\"version\":1,\""+field+"\":\"forged\""))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/me/profile").header("Authorization","Bearer "+otherToken)).andExpect(jsonPath("$.address").isEmpty());
        mvc.perform(get("/api/v1/me/profile")).andExpect(status().isUnauthorized());
    }
    @Test void passwordRequiresReauthAndRevokesEverySessionImmediately()throws Exception{
        String second=auth.login(account.getEmail(),password).tokens().accessToken();
        post("/api/v1/me/password",token,"{\"currentPassword\":\"wrong\",\"newPassword\":\"Updated-account!12345\",\"version\":0}").andExpect(status().isForbidden());
        post("/api/v1/me/password",token,"{\"currentPassword\":\""+password+"\",\"newPassword\":\"Updated-account!12345\",\"version\":0}").andExpect(status().isNoContent()).andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE,0));
        for(String old:List.of(token,second))mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+old)).andExpect(status().isUnauthorized());
        assertThrows(com.ancu.proptech.exception.auth.AuthException.class,()->auth.login(account.getEmail(),password));assertNotNull(auth.login(account.getEmail(),"Updated-account!12345"));
    }
    @Test void passwordUtf8LimitAndReuseAreRejected()throws Exception{
        post("/api/v1/me/password",token,"{\"currentPassword\":\""+password+"\",\"newPassword\":\""+password+"\",\"version\":0}").andExpect(status().isBadRequest());
        post("/api/v1/me/password",token,"{\"currentPassword\":\""+password+"\",\"newPassword\":\""+"ậ".repeat(30)+"\",\"version\":0}").andExpect(status().isBadRequest());
    }
    @Test void phoneIsNormalizedUnverifiedAndSessionsAreRevoked()throws Exception{
        post("/api/v1/me/phone",token,"{\"phone\":\"0912345678\",\"currentPassword\":\""+password+"\",\"version\":0}").andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("+84912345678")).andExpect(jsonPath("$.phoneVerified").value(false)).andExpect(jsonPath("$.emailVerified").value(true));
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
    @Test void unverifiedPhoneContactDoesNotReserveAnotherAccountsIdentity()throws Exception{
        String body="{\"phone\":\"0912345678\",\"currentPassword\":\""+password+"\",\"version\":0}";
        post("/api/v1/me/phone",token,body).andExpect(status().isOk()).andExpect(jsonPath("$.phoneVerified").value(false));
        post("/api/v1/me/phone",otherToken,body).andExpect(status().isOk()).andExpect(jsonPath("$.phoneVerified").value(false));
    }
    @Test void emailRemainsUnchangedUntilOtpThenRevokesSessionAndCannotBeReused()throws Exception{
        String oldEmail=account.getEmail(),id=challenge();assertEquals(oldEmail,accounts.findById(account.getId()).orElseThrow().getEmail());
        var saved=challenges.findById(UUID.fromString(id)).orElseThrow();assertNotEquals(code,saved.getCodeHash());
        post("/api/v1/me/email-changes/"+id+"/confirm",otherToken,"{\"code\":\""+code+"\"}").andExpect(status().isNotFound());
        post("/api/v1/me/email-changes/"+id+"/confirm",token,"{\"code\":\""+code+"\"}").andExpect(status().isOk()).andExpect(jsonPath("$.emailVerified").value(true));
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
        String email=accounts.findById(account.getId()).orElseThrow().getEmail();String fresh=auth.login(email,password).tokens().accessToken();
        post("/api/v1/me/email-changes/"+id+"/confirm",fresh,"{\"code\":\""+code+"\"}").andExpect(status().isBadRequest());
    }
    @Test void wrongAttemptsExpireResendAndStaleChallengeAreEnforced()throws Exception{
        String id=challenge();String wrong=code.equals("000000")?"000001":"000000";
        for(int i=0;i<5;i++)post("/api/v1/me/email-changes/"+id+"/confirm",token,"{\"code\":\""+wrong+"\"}").andExpect(status().isBadRequest());
        var c=challenges.findById(UUID.fromString(id)).orElseThrow();assertEquals(5,c.getAttempts());assertNotNull(c.getInvalidatedAt());
        c.setCreatedAt(Instant.now().minusSeconds(61));challenges.saveAndFlush(c);String next=challenge();
        post("/api/v1/me/email-changes",token,emailBody("another@example.invalid",0)).andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After","60"));
        var latest=challenges.findById(UUID.fromString(next)).orElseThrow();latest.setExpiresAt(Instant.now().minusSeconds(1));challenges.saveAndFlush(latest);
        post("/api/v1/me/email-changes/"+next+"/confirm",token,"{\"code\":\""+code+"\"}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("OTP_EXPIRED"));
    }
    @Test void providerFailureDoesNotCreateChallengeOrChangeContacts()throws Exception{
        when(sender.isConfigured()).thenReturn(false);post("/api/v1/me/email-changes",token,emailBody("new@example.invalid",0)).andExpect(status().isServiceUnavailable());
        assertEquals(0,challenges.countByAccountIdAndCreatedAtAfter(account.getId(),Instant.EPOCH));
        when(sender.isConfigured()).thenReturn(true);doThrow(new com.ancu.proptech.exception.auth.AuthException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","Unavailable")).when(sender).send(anyString(),anyString());
        post("/api/v1/me/email-changes",token,emailBody("new@example.invalid",0)).andExpect(status().isServiceUnavailable());assertEquals(0,challenges.countByAccountIdAndCreatedAtAfter(account.getId(),Instant.EPOCH));
    }
    @Test void profileChangeInvalidatesChallengeVersionAndResendReplacesOldCode()throws Exception{
        String first=challenge(),oldCode=code;var old=challenges.findById(UUID.fromString(first)).orElseThrow();old.setCreatedAt(Instant.now().minusSeconds(61));challenges.saveAndFlush(old);
        String second=challenge();post("/api/v1/me/email-changes/"+first+"/confirm",token,"{\"code\":\""+oldCode+"\"}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("OTP_NOT_ACTIVE"));
        mvc.perform(patch("/api/v1/me").header("Authorization","Bearer "+token).contentType("application/json").content("{\"fullName\":\"Changed while OTP pending\",\"version\":0}")).andExpect(status().isOk());
        post("/api/v1/me/email-changes/"+second+"/confirm",token,"{\"code\":\""+code+"\"}").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));assertNotNull(challenges.findById(UUID.fromString(second)).orElseThrow().getInvalidatedAt());
    }
    @Test void pendingAccountCanVerifyEmailButLockedAccountCannotBeReactivated()throws Exception{
        account.setStatus(AuthAccount.Status.PENDING_VERIFICATION);account.setEmailVerified(false);account.setContactVerified(false);accounts.saveAndFlush(account);
        token=auth.login(account.getEmail(),password).tokens().accessToken();String id=JsonPath.read(post("/api/v1/me/email-changes",token,emailBody(account.getEmail(),account.getVersion())).andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString(),"$.id");
        post("/api/v1/me/email-changes/"+id+"/confirm",token,"{\"code\":\""+code+"\"}").andExpect(status().isOk()).andExpect(jsonPath("$.accountStatus").value("ACTIVE"));
        token=auth.login(account.getEmail(),password).tokens().accessToken();challenges.findById(UUID.fromString(id)).orElseThrow().setCreatedAt(Instant.now().minusSeconds(61));challenges.flush();String next=challenge();account=accounts.findById(account.getId()).orElseThrow();account.setStatus(AuthAccount.Status.LOCKED);accounts.saveAndFlush(account);
        post("/api/v1/me/email-changes/"+next+"/confirm",token,"{\"code\":\""+code+"\"}").andExpect(status().isUnauthorized());assertEquals(AuthAccount.Status.LOCKED,accounts.findById(account.getId()).orElseThrow().getStatus());
    }
}
