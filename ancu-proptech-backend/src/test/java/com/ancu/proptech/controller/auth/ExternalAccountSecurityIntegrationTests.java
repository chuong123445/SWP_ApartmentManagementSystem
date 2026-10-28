package com.ancu.proptech.controller.auth;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.service.auth.*;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"app.auth.vneid.enabled=true","app.auth.vneid.issuer=https://test.invalid/","app.auth.vneid.client-id=test-client","app.auth.vneid.audience=test-api","app.auth.google-client-id=test-google","app.auth.otp-secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class ExternalAccountSecurityIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;
    @Autowired AccountReauthenticationRepository proofs;@Autowired AuthService auth;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
    @MockitoBean ExternalReauthenticationVerifier verifier;@MockitoBean EmailOtpSender sender;
    AuthAccount a;String token,subject;String code;
    @BeforeEach void setup(){
        a=new AuthAccount();a.setEmail("external-security-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Người thử bảo mật");a.setRole(AuthAccount.Role.CUSTOMER);a.setStatus(AuthAccount.Status.ACTIVE);a.setLocalPasswordEnabled(false);accounts.saveAndFlush(a);
        var identity=com.ancu.proptech.support.VerifiedIdentityFixtures.bind(identities,a);identity.setIssuer("https://test.invalid/");identities.flush();subject=identity.getSubject();token=auth.createSession(a).tokens().accessToken();
        when(sender.isConfigured()).thenReturn(true);doAnswer(i->{code=i.getArgument(1);return null;}).when(sender).send(anyString(),anyString());
    }
    ResultActions post(String url,String bearer,String body)throws Exception{return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url).header("Authorization","Bearer "+bearer).contentType("application/json").content(body));}
    String begin(String purpose)throws Exception{return post("/api/v1/me/reauthentications",token,"{\"purpose\":\""+purpose+"\"}").andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsString();}
    Jwt external(String sub,long authTime,String nonce){var b=Jwt.withTokenValue("external-test").header("alg","RS256").issuer("https://test.invalid/").subject(sub).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).claim("auth_time",authTime);if(nonce!=null)b.claim("nonce",nonce);return b.build();}
    String confirm(String challenge,String provider,Jwt external)throws Exception{String credential="provider-"+UUID.randomUUID();when(verifier.decode(provider,credential)).thenReturn(external);return post("/api/v1/me/reauthentications/"+JsonPath.read(challenge,"$.id")+"/confirm",token,"{\"provider\":\""+provider+"\",\"credential\":\""+credential+"\"}").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();}
    String proof(String purpose)throws Exception{return JsonPath.read(confirm(begin(purpose),"AUTH0",external(subject,Instant.now().getEpochSecond(),null)),"$.proof");}
    @Test void externalUserCanSetLocalPasswordAndAllOldSessionsAreRevoked()throws Exception{
        mvc.perform(get("/api/v1/me/security").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.passwordAvailable").value(false)).andExpect(jsonPath("$.providers[0]").value("AUTH0"));
        String other=auth.createSession(a).tokens().accessToken();String p=proof("PASSWORD");assertEquals(43,p.length());assertFalse(proofs.findAll().toString().contains(p));
        post("/api/v1/me/password",token,"{\"reauthenticationProof\":\""+p+"\",\"newPassword\":\"Established-password!123\",\"version\":"+a.getVersion()+"}").andExpect(status().isNoContent());
        assertTrue(a.isLocalPasswordEnabled());assertNotNull(auth.login(a.getEmail(),"Established-password!123"));
        for(String stale:List.of(token,other))mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+stale)).andExpect(status().isUnauthorized());
        assertFalse(a.isEmailVerified());
    }
    @Test void wrongSubjectStaleAuthTimeAndAbsentAuthTimeCannotAuthorizeAnything()throws Exception{
        String c=begin("PASSWORD");String id=JsonPath.read(c,"$.id");
        for(Jwt external:List.of(external("different-subject",Instant.now().getEpochSecond(),null),external(subject,Instant.now().minusSeconds(600).getEpochSecond(),null),Jwt.withTokenValue("noauth").header("alg","RS256").issuer("https://test.invalid/").subject(subject).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build())){
            when(verifier.decode("AUTH0","bad")).thenReturn(external);post("/api/v1/me/reauthentications/"+id+"/confirm",token,"{\"provider\":\"AUTH0\",\"credential\":\"bad\"}").andExpect(status().isForbidden());
        }assertNull(a.getPasswordHash());
    }
    @Test void proofIsBoundToPurposeSessionVersionAndExpiry()throws Exception{
        String p=proof("PHONE");String body="{\"reauthenticationProof\":\""+p+"\",\"newPassword\":\"Established-password!123\",\"version\":"+a.getVersion()+"}";
        post("/api/v1/me/password",token,body).andExpect(status().isForbidden());String another=auth.createSession(a).tokens().accessToken();
        post("/api/v1/me/phone",another,"{\"reauthenticationProof\":\""+p+"\",\"phone\":\"0912345678\",\"version\":"+a.getVersion()+"}").andExpect(status().isForbidden());
        var row=proofs.findAll().stream().filter(x->x.getAccountId().equals(a.getId())).findFirst().orElseThrow();row.setExpiresAt(Instant.now().minusSeconds(1));proofs.flush();
        post("/api/v1/me/phone",token,"{\"reauthenticationProof\":\""+p+"\",\"phone\":\"0912345678\",\"version\":"+a.getVersion()+"}").andExpect(status().isForbidden());
    }
    @Test void googleRequiresExactSubjectAndServerChallengeNonce()throws Exception{
        a.setGoogleSubject("google-subject");accounts.flush();String c=begin("PHONE");String nonce=JsonPath.read(c,"$.nonce");String id=JsonPath.read(c,"$.id");
        when(verifier.decode("GOOGLE","wrong-nonce")).thenReturn(external(a.getGoogleSubject(),0,"different"));post("/api/v1/me/reauthentications/"+id+"/confirm",token,"{\"provider\":\"GOOGLE\",\"credential\":\"wrong-nonce\"}").andExpect(status().isForbidden());
        String p=JsonPath.read(confirm(c,"GOOGLE",external(a.getGoogleSubject(),0,nonce)),"$.proof");
        post("/api/v1/me/phone",token,"{\"reauthenticationProof\":\""+p+"\",\"phone\":\"0912345678\",\"version\":"+a.getVersion()+"}").andExpect(status().isOk()).andExpect(jsonPath("$.phoneVerified").value(false));assertEquals("+84912345678",a.getPhone());
    }
    @Test void emailStillRequiresNewAddressOtpAndProofCannotBeReplayed()throws Exception{
        String old=a.getEmail();String p=proof("EMAIL");String body="{\"email\":\"new-"+old+"\",\"reauthenticationProof\":\""+p+"\",\"version\":"+a.getVersion()+"}";
        String result=post("/api/v1/me/email-changes",token,body).andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();assertEquals(old,a.getEmail());assertNotNull(code);
        post("/api/v1/me/email-changes",token,body).andExpect(status().isForbidden());
        post("/api/v1/me/email-changes/"+JsonPath.read(result,"$.id")+"/confirm",token,"{\"code\":\""+code+"\"}").andExpect(status().isOk());assertEquals("new-"+old,a.getEmail());assertTrue(a.isEmailVerified());
    }
    @Test void challengeCannotBeConfirmedTwiceAndVersionChangesInvalidateProof()throws Exception{
        String c=begin("PASSWORD");String result=confirm(c,"AUTH0",external(subject,Instant.now().getEpochSecond(),null));
        post("/api/v1/me/reauthentications/"+JsonPath.read(c,"$.id")+"/confirm",token,"{\"provider\":\"AUTH0\",\"credential\":\"unused\"}").andExpect(status().isForbidden());
        a.setFullName("Updated name");accounts.flush();post("/api/v1/me/password",token,"{\"reauthenticationProof\":\""+JsonPath.read(result,"$.proof")+"\",\"newPassword\":\"Established-password!123\",\"version\":"+a.getVersion()+"}").andExpect(status().isForbidden());
    }
    @Test void noProofOrPasswordCannotBypassSensitiveCommands()throws Exception{
        post("/api/v1/me/password",token,"{\"newPassword\":\"Established-password!123\",\"version\":"+a.getVersion()+"}").andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/me/security")).andExpect(status().isUnauthorized());
    }
    @Test void legacyGooglePasswordStillWorksAndProviderCanReplaceIt()throws Exception{
        a.setGoogleSubject("legacy-google");a.setPasswordHash(passwords.encode("Existing-password!123"));a.setLocalPasswordEnabled(true);accounts.flush();
        assertNotNull(auth.login(a.getEmail(),"Existing-password!123"));
        mvc.perform(get("/api/v1/me/security").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.passwordAvailable").value(true));
        String p=proof("PASSWORD");post("/api/v1/me/password",token,"{\"reauthenticationProof\":\""+p+"\",\"newPassword\":\"Replacement-password!123\",\"version\":"+a.getVersion()+"}").andExpect(status().isNoContent());
        assertNotNull(auth.login(a.getEmail(),"Replacement-password!123"));
    }
}
