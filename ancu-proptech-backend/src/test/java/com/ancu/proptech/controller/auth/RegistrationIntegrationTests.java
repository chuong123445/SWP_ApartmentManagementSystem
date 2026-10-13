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
    @BeforeEach void setup(){email="register-test-"+UUID.randomUUID()+"@example.invalid";when(sender.isConfigured()).thenReturn(true);doAnswer(i->{code=i.getArgument(1);return null;}).when(sender).send(anyString(),anyString());}
    private String body(String role){return "{\"email\":\""+email.toUpperCase(Locale.ROOT)+"\",\"password\":\""+password+"\",\"fullName\":\" Chủ nhà mới \",\"phone\":\"0912345678\",\"requestedRole\":\""+role+"\"}";}
    private ResultActions register(String content)throws Exception{return mvc.perform(post("/api/v1/auth/register").with(csrf().asHeader()).contentType("application/json").content(content));}
    @Test void bothAllowedRolesPersistUnverifiedWithoutSecretsOrSessions()throws Exception{
        for(String role:List.of("OWNER","CUSTOMER")){
            email="register-test-"+UUID.randomUUID()+"@example.invalid";
            register(body(role)).andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.roles[0]").value(role)).andExpect(jsonPath("$.accountStatus").value("PENDING_VERIFICATION"))
                .andExpect(jsonPath("$.contactVerificationStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.accessToken").doesNotExist());
            var account=accounts.findByEmail(email).orElseThrow();assertTrue(passwords.matches(password,account.getPasswordHash()));
            assertFalse(account.isContactVerified());assertFalse(account.isEmailVerified());assertFalse(account.isPhoneVerified());
            assertEquals("+84912345678",account.getPhone());assertEquals("Chủ nhà mới",account.getFullName());
        }
        verify(sender,never()).send(anyString(),anyString());
    }
    @Test void adminTenantUnknownAndNumericRoleCannotRegister()throws Exception{
        for(String role:List.of("ADMIN","TENANT","owner","UNKNOWN"))register(body(role)).andExpect(status().isBadRequest());
        register(body("OWNER").replace("\"OWNER\"","0")).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void forgedAuthorityAndIdentityFieldsAreRejected()throws Exception{
        for(String extra:List.of("\"status\":\"ACTIVE\"","\"contactVerified\":true","\"role\":\"ADMIN\"","\"id\":\""+UUID.randomUUID()+"\"","\"emailVerified\":true"))
            register(body("CUSTOMER").replace("}",","+extra+"}")).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void registrationRequiresCsrf()throws Exception{
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body("OWNER"))).andExpect(status().isForbidden());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void duplicateEmailIsCaseInsensitiveAndDoesNotResetExistingAccount()throws Exception{
        register(body("CUSTOMER")).andExpect(status().isCreated());var original=accounts.findByEmail(email).orElseThrow();
        register(body("OWNER")).andExpect(status().isConflict());assertEquals(AuthAccount.Role.CUSTOMER,original.getRole());assertTrue(passwords.matches(password,original.getPasswordHash()));
    }
    @Test void weakOversizedUtf8AndInvalidPhoneAreRejected()throws Exception{
        register(body("OWNER").replace(password,"short")).andExpect(status().isBadRequest());
        register(body("OWNER").replace(password,"ấ".repeat(30))).andExpect(status().isBadRequest());
        register(body("OWNER").replace("0912345678","abc")).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void pendingOwnerIsBlockedUntilEmailOtpThenMustRelogin()throws Exception{
        register(body("OWNER")).andExpect(status().isCreated());String token=auth.login(email,password).tokens().accessToken();
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        var result=mvc.perform(post("/api/v1/me/email-changes").header("Authorization","Bearer "+token).contentType("application/json")
            .content("{\"email\":\""+email+"\",\"currentPassword\":\""+password+"\",\"version\":0}")).andExpect(status().isAccepted()).andExpect(jsonPath("$.code").doesNotExist()).andReturn();
        String challenge=JsonPath.read(result.getResponse().getContentAsString(),"$.id");
        mvc.perform(post("/api/v1/me/email-changes/"+challenge+"/confirm").header("Authorization","Bearer "+token).contentType("application/json").content("{\"code\":\""+code+"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.accountStatus").value("ACTIVE"));
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
        String verified=auth.login(email,password).tokens().accessToken();
        mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+verified)).andExpect(status().isOk());
    }
    @Test void smtpFailureLeavesRegisteredCustomerPendingAndNoBusinessAccess()throws Exception{
        register(body("CUSTOMER")).andExpect(status().isCreated());String token=auth.login(email,password).tokens().accessToken();
        doThrow(new AuthException(HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","SMTP unavailable")).when(sender).send(anyString(),anyString());
        mvc.perform(post("/api/v1/me/email-changes").header("Authorization","Bearer "+token).contentType("application/json")
            .content("{\"email\":\""+email+"\",\"currentPassword\":\""+password+"\",\"version\":0}")).andExpect(status().isServiceUnavailable());
        assertEquals(AuthAccount.Status.PENDING_VERIFICATION,accounts.findByEmail(email).orElseThrow().getStatus());
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
    }
    @Test void customerRequiresSuccessfulEmailOtpAndReloginForRentalAccess()throws Exception{
        register(body("CUSTOMER")).andExpect(status().isCreated());String token=auth.login(email,password).tokens().accessToken();
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
