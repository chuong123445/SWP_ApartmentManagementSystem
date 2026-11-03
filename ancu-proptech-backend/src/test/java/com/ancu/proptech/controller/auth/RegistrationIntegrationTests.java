package com.ancu.proptech.controller.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.service.auth.*;
import com.ancu.proptech.exception.auth.AuthException;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.auth.otp-secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","app.auth.secure-cookie=false"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class RegistrationIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired PasswordEncoder passwords;
    @Autowired AuthService auth;@MockitoBean EmailOtpSender sender;
    private String email,code;
    private final String password=" Register-test!123 ";
    @BeforeEach void setup(){email="register-test-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid";when(sender.isConfigured()).thenReturn(true);doAnswer(i->{code=i.getArgument(1);return null;}).when(sender).send(anyString(),anyString());}
    private String body(){return "{\"email\":\""+email.toUpperCase(Locale.ROOT)+"\",\"password\":\""+password+"\",\"fullName\":\" Chủ nhà mới \",\"phone\":\"0912345678\"}";}
    private ResultActions register(String content)throws Exception{return mvc.perform(post("/api/v1/auth/register").with(csrf().asHeader()).contentType("application/json").content(content));}
    @Test void legacyBackfillOnlyFillsBlanksUnverifiedAndIsIdempotent()throws Exception {
        register(body()).andExpect(status().isCreated());var legacy=accounts.findByEmail(email).orElseThrow();
        legacy.setPhone(null);legacy.setPhoneVerified(true);accounts.flush();long version=legacy.getVersion();String hash=legacy.getPasswordHash();
        String retainedEmail="preserve-"+email;register(body().replace(email.toUpperCase(Locale.ROOT),retainedEmail)).andExpect(status().isCreated());
        var retained=accounts.findByEmail(retainedEmail).orElseThrow();long retainedVersion=retained.getVersion();
        String legacyToken=auth.login(email,password).tokens().accessToken();String retainedToken=auth.login(retainedEmail,password).tokens().accessToken();
        var source=new org.springframework.core.io.ClassPathResource("db/migration/V51__registration_contact_details.sql");
        String script;try(var stream=source.getInputStream()){script=new String(stream.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}
        try(var stream=new org.springframework.core.io.ClassPathResource("db/local/backfill_legacy_contact_phones.sql").getInputStream()){script+="\n"+new String(stream.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}
        var jdbc=new org.springframework.jdbc.core.JdbcTemplate(sourceDataSource);
        for(int repeat=0;repeat<2;repeat++)for(String batch:script.split("(?im)^GO\\s*$"))if(!batch.isBlank())jdbc.execute(batch);
        sourceEntityManager.clear();var result=accounts.findById(legacy.getId()).orElseThrow();
        assertEquals("+849"+String.format("%08d",legacy.getId()%100000000),result.getPhone());assertFalse(result.isPhoneVerified());
        assertEquals(version+1,result.getVersion());assertEquals(hash,result.getPasswordHash());assertEquals(AuthAccount.Status.PENDING_VERIFICATION,result.getStatus());
        assertNull(result.getContactDetailsConfirmedAt());assertEquals(retainedVersion,accounts.findById(retained.getId()).orElseThrow().getVersion());
        assertEquals("+84912345678",accounts.findById(retained.getId()).orElseThrow().getPhone());
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+legacyToken)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+retainedToken)).andExpect(status().isOk());
    }
    @org.springframework.beans.factory.annotation.Autowired javax.sql.DataSource sourceDataSource;
    @org.springframework.beans.factory.annotation.Autowired jakarta.persistence.EntityManager sourceEntityManager;
    private javax.sql.DataSource dataSource(){return sourceDataSource;}
    private jakarta.persistence.EntityManager entityManager(){return sourceEntityManager;}
    @Test void phoneIsMandatoryAndMustHaveVietnameseFormat()throws Exception {
        for(String phone:List.of(""," ","+12025550123","091234567","01234567890","0612345678"))register(body().replace("0912345678",phone)).andExpect(status().isBadRequest());
        register(body().replace(",\"phone\":\"0912345678\"","")).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
        register(body().replace("0912345678","+84 912 345 678")).andExpect(status().isCreated());
        assertEquals("+84912345678",accounts.findByEmail(email).orElseThrow().getPhone());
        assertFalse(accounts.findByEmail(email).orElseThrow().isPhoneVerified());
    }
    @Test void defaultCustomerPersistsUnverifiedWithoutSecretsOrSessions()throws Exception{
        for(String role:List.of("CUSTOMER")){
            email="register-test-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid";
            register(body()).andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.roles[0]").value(role)).andExpect(jsonPath("$.accountStatus").value("PENDING_VERIFICATION"))
                .andExpect(jsonPath("$.contactVerificationStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.accessToken").doesNotExist());
            var account=accounts.findByEmail(email).orElseThrow();assertTrue(passwords.matches(password,account.getPasswordHash()));
            assertFalse(account.isContactVerified());assertFalse(account.isEmailVerified());assertFalse(account.isPhoneVerified());
            assertEquals("+84912345678",account.getPhone());assertEquals("Chủ nhà mới",account.getFullName());
        }
        verify(sender,never()).send(anyString(),anyString());
    }
    @Test void callerCannotSelectAnyRoleDuringRegistration()throws Exception{
        for(String role:List.of("OWNER","CUSTOMER","ADMIN","TENANT","owner","UNKNOWN"))register(body().replace("}",",\"requestedRole\":\""+role+"\"}")).andExpect(status().isBadRequest());
        register(body().replace("}",",\"requestedRole\":0}")).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void forgedAuthorityAndIdentityFieldsAreRejected()throws Exception{
        for(String extra:List.of("\"status\":\"ACTIVE\"","\"contactVerified\":true","\"role\":\"ADMIN\"","\"id\":\""+com.ancu.proptech.support.TestIds.next()+"\"","\"emailVerified\":true"))
            register(body().replace("}",","+extra+"}")).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void registrationRequiresCsrf()throws Exception{
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body())).andExpect(status().isForbidden());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void duplicateEmailIsCaseInsensitiveAndDoesNotResetExistingAccount()throws Exception{
        register(body()).andExpect(status().isCreated());var original=accounts.findByEmail(email).orElseThrow();
        register(body()).andExpect(status().isConflict());assertEquals(AuthAccount.Role.CUSTOMER,original.getRole());assertTrue(passwords.matches(password,original.getPasswordHash()));
    }
    @Test void weakOversizedUtf8AndInvalidPhoneAreRejected()throws Exception{
        register(body().replace(password,"short")).andExpect(status().isBadRequest());
        register(body().replace(password,"ấ".repeat(30))).andExpect(status().isBadRequest());
        register(body().replace("0912345678","abc")).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void emailOtpActivatesCustomerWithoutGrantingOwner()throws Exception{
        register(body()).andExpect(status().isCreated());String token=auth.login(email,password).tokens().accessToken();
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        var result=mvc.perform(post("/api/v1/me/email-changes").header("Authorization","Bearer "+token).contentType("application/json")
            .content("{\"email\":\""+email+"\",\"currentPassword\":\""+password+"\",\"version\":0}")).andExpect(status().isAccepted()).andExpect(jsonPath("$.code").doesNotExist()).andReturn();
        String challenge=JsonPath.read(result.getResponse().getContentAsString(),"$.id");
        mvc.perform(post("/api/v1/me/email-changes/"+challenge+"/confirm").header("Authorization","Bearer "+token).contentType("application/json").content("{\"code\":\""+code+"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.accountStatus").value("ACTIVE"));
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
        String verified=auth.login(email,password).tokens().accessToken();
        mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+verified)).andExpect(status().isForbidden());
    }
    @Test void smtpFailureLeavesRegisteredCustomerPendingAndNoBusinessAccess()throws Exception{
        register(body()).andExpect(status().isCreated());String token=auth.login(email,password).tokens().accessToken();
        doThrow(new AuthException(HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","SMTP unavailable")).when(sender).send(anyString(),anyString());
        mvc.perform(post("/api/v1/me/email-changes").header("Authorization","Bearer "+token).contentType("application/json")
            .content("{\"email\":\""+email+"\",\"currentPassword\":\""+password+"\",\"version\":0}")).andExpect(status().isServiceUnavailable());
        assertEquals(AuthAccount.Status.PENDING_VERIFICATION,accounts.findByEmail(email).orElseThrow().getStatus());
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
    }
    @Test void customerRequiresSuccessfulEmailOtpAndReloginForRentalAccess()throws Exception{
        register(body()).andExpect(status().isCreated());String token=auth.login(email,password).tokens().accessToken();
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        String challenge=JsonPath.read(mvc.perform(post("/api/v1/me/email-changes").header("Authorization","Bearer "+token).contentType("application/json")
            .content("{\"email\":\""+email+"\",\"currentPassword\":\""+password+"\",\"version\":0}"))
            .andExpect(status().isAccepted()).andExpect(jsonPath("$.code").doesNotExist()).andReturn().getResponse().getContentAsString(),"$.id");
        mvc.perform(post("/api/v1/me/email-changes/"+challenge+"/confirm").header("Authorization","Bearer "+token).contentType("application/json").content("{\"code\":\""+code+"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.accountStatus").value("ACTIVE")).andExpect(jsonPath("$.emailVerified").value(true));
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
        String verified=auth.login(email,password).tokens().accessToken();
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization","Bearer "+verified)).andExpect(status().isOk());
    }

}
