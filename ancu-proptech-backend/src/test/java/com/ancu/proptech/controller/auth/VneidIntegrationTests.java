package com.ancu.proptech.controller.auth;

import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.service.auth.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.auth.secure-cookie=false","app.seed.enabled=false","app.billing.local-fixtures=false",
        "app.auth.vneid.enabled=true","app.auth.vneid.issuer=https://test.invalid/","app.auth.vneid.client-id=test-client","app.auth.vneid.audience=test-api"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class VneidIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired ExternalIdentityRepository identities;
    @Autowired AuthService auth;
    @Autowired EntityManager em;
    @Autowired org.springframework.transaction.support.TransactionTemplate transactions;
    @MockitoBean VneidTokenVerifier verifier;
    String token,email,subject,number;
    Jwt external;
    @BeforeEach void setup() {
        token="external-"+com.ancu.proptech.support.TestIds.next();email="vneid-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid";subject="auth0|"+com.ancu.proptech.support.TestIds.next();
        number=String.format("%012d",Math.abs(com.ancu.proptech.support.TestIds.next().longValue()%1000000000000L));
        external=claims("20/05/1990");when(verifier.decode(token)).thenReturn(external);
    }
    Jwt claims(String dob) {
        return Jwt.withTokenValue(token).header("alg","RS256").subject(subject).issuer("https://test.invalid/")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(600))
                .claim(VneidTokenVerifier.NS+"cccd_number",number).claim(VneidTokenVerifier.NS+"full_name","Người kiểm thử Auth0")
                .claim(VneidTokenVerifier.NS+"dob",dob).claim(VneidTokenVerifier.NS+"gender","Nam")
                .claim(VneidTokenVerifier.NS+"address","Đà Nẵng").claim(VneidTokenVerifier.NS+"email",email).build();
    }
    String contactBody(){return "{\"email\":\""+email+"\",\"phone\":\"0912345678\"}";}
    String login() throws Exception {
        return mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token).contentType("application/json").content(contactBody()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.contactVerificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.user.roles[0]").value("CUSTOMER"))
                .andExpect(header().string("Set-Cookie",org.hamcrest.Matchers.containsString("HttpOnly")))
                .andReturn().getResponse().getContentAsString();
    }
    @Test void createsAccountAndKeepsContactFlagsFalse() throws Exception {
        login();var a=accounts.findByEmail(email).orElseThrow();
        assertNull(a.getPasswordHash());assertFalse(a.isEmailVerified());assertFalse(a.isPhoneVerified());
        assertEquals(AuthAccount.Status.ACTIVE,a.getStatus());assertEquals("VERIFIED",identities.findById(a.getId()).orElseThrow().getVerificationStatus());
        mvc.perform(post("/api/v1/auth/login").with(csrf().asHeader()).contentType("application/json")
                .content("{\"email\":\""+email+"\",\"password\":\"Password-test-only!\"}")).andExpect(status().isUnauthorized());
    }
    @Test void firstLoginRequiresContactBeforeCreatingAccountOrSession()throws Exception {
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token))
            .andExpect(status().isPreconditionRequired()).andExpect(jsonPath("$.code").value("VNEID_CONTACT_REQUIRED"))
            .andExpect(header().doesNotExist("Set-Cookie")).andExpect(jsonPath("$.accessToken").doesNotExist());
        assertTrue(accounts.findByEmail(email).isEmpty());assertTrue(identities.findByIssuerAndSubject("https://test.invalid/",subject).isEmpty());
        for(String phone:List.of("","+12025550123","01234567890"))mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token)
            .contentType("application/json").content(contactBody().replace("0912345678",phone))).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
        login();var a=accounts.findByEmail(email).orElseThrow();assertEquals("+84912345678",a.getPhone());assertNotNull(a.getContactDetailsConfirmedAt());
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token)).andExpect(status().isOk());
    }
    @Test void usernameOnlyProviderCanCollectUnverifiedContactEmailWithoutEmailClaim()throws Exception {
        var noEmail=Jwt.withTokenValue(token).headers(h->h.putAll(external.getHeaders())).claims(c->{c.putAll(external.getClaims());c.remove(VneidTokenVerifier.NS+"email");}).build();
        when(verifier.decode(token)).thenReturn(noEmail);login();
        var a=accounts.findByEmail(email).orElseThrow();assertFalse(a.isEmailVerified());assertFalse(a.isPhoneVerified());
    }
    @Test void legacyBindingMustConfirmContactsWithoutBypassingEmailChangeOrPreservingOldSessions()throws Exception {
        String previous=login();String oldAccess=com.jayway.jsonpath.JsonPath.read(previous,"$.accessToken");
        var a=accounts.findByEmail(email).orElseThrow();a.setContactDetailsConfirmedAt(null);accounts.flush();
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token)).andExpect(status().isPreconditionRequired());
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token).contentType("application/json")
            .content(contactBody().replace(email,"changed@example.invalid"))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VNEID_EMAIL_CHANGE_REQUIRED"));
        assertEquals(email,a.getEmail());assertNull(a.getContactDetailsConfirmedAt());
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token).contentType("application/json")
            .content(contactBody().replace("0912345678","0387654321"))).andExpect(status().isOk());
        assertEquals("+84387654321",a.getPhone());assertNotNull(a.getContactDetailsConfirmedAt());assertFalse(a.isPhoneVerified());
        assertNotNull(accounts.findById(a.getId()).orElseThrow().getContactDetailsConfirmedAt());
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+oldAccess)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token).contentType("application/json")
            .content(contactBody())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VNEID_CONTACT_ALREADY_CONFIRMED"));
    }
    @Test void sameSubjectLogsInAgainWithoutOverwritingProfile() throws Exception {
        login();var a=accounts.findByEmail(email).orElseThrow();a.setFullName("Tên người dùng đã sửa");accounts.flush();
        login();assertEquals("Tên người dùng đã sửa",accounts.findById(a.getId()).orElseThrow().getFullName());
        assertEquals(1,identities.findAll().stream().filter(i->i.getSubject().equals(subject)).count());
    }
    @Test void rejectsExistingEmailWithoutAutoLink() throws Exception {
        account(AuthAccount.Role.OWNER,AuthAccount.Status.PENDING_VERIFICATION);
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VNEID_ACCOUNT_LINK_REQUIRED"));
    }
    @Test void sameBindingFreshLoginFillsMissingCitizenDetailsWithoutContactOrCredentialChanges()throws Exception {
        login();var account=accounts.findByEmail(email).orElseThrow();var original=identities.findById(account.getId()).orElseThrow();
        Instant verifiedAt=original.getVerifiedAt();String displayName=account.getFullName();
        var detailed=Jwt.withTokenValue(token).headers(h->h.putAll(claims("20/05/1990").getHeaders()))
            .claims(c->c.putAll(claims("20/05/1990").getClaims()))
            .claim(VneidTokenVerifier.NS+"phone_number","+84999000002")
            .claim(VneidTokenVerifier.NS+"document_issue_date","16/06/2021")
            .claim(VneidTokenVerifier.NS+"document_issue_place","Cục Cảnh sát quản lý hành chính về trật tự xã hội")
            .claim(VneidTokenVerifier.NS+"permanent_address","54 Hoàng Diệu, phường Phước Ninh, quận Hải Châu, thành phố Đà Nẵng").build();
        when(verifier.decode(token)).thenReturn(detailed);login();
        var filled=identities.findById(account.getId()).orElseThrow();assertNotNull(filled.getDocumentIssuePlace());
        assertEquals(LocalDate.of(2021,6,16),filled.getDocumentIssueDate());assertEquals(verifiedAt,filled.getVerifiedAt());assertNotNull(filled.getDetailsUpdatedAt());
        assertEquals(displayName,account.getFullName());assertEquals("+84912345678",account.getPhone());assertNull(account.getPasswordHash());
        assertFalse(account.isEmailVerified());assertFalse(account.isPhoneVerified());long version=filled.getVersion();
        login();assertEquals(version,identities.findById(account.getId()).orElseThrow().getVersion());
    }
    @Test void needsCsrfAndDoesNotAcceptInternalJwtAsAuth0() throws Exception {
        mvc.perform(post("/api/v1/auth/vneid-login").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        when(verifier.decode("bad")).thenThrow(new BadJwtException("bad"));
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer bad")).andExpect(status().isUnauthorized());
    }
    @Test void externalTokenCannotCallBusinessApi() throws Exception {
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
    @Test void invalidDateRollsBack() throws Exception {
        when(verifier.decode(token)).thenReturn(claims("31/02/1990"));
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void selfVerificationActivatesOwnerWithoutChangingRoleOrEmail() throws Exception {
        var a=account(AuthAccount.Role.OWNER,AuthAccount.Status.PENDING_VERIFICATION);String internal=auth.createSession(a).tokens().accessToken();
        self(internal).andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("OWNER"))
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE")).andExpect(jsonPath("$.contactVerificationStatus").value("VERIFIED"));
        assertFalse(a.isEmailVerified());long version=identities.findById(a.getId()).orElseThrow().getVersion();
        self(internal).andExpect(status().isOk());assertEquals(version,identities.findById(a.getId()).orElseThrow().getVersion());
        mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+internal)).andExpect(status().isOk());
    }
    @Test void preventsCrossAccountBinding() throws Exception {
        login();email="other-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid";
        var other=account(AuthAccount.Role.CUSTOMER,AuthAccount.Status.PENDING_VERIFICATION);
        self(auth.createSession(other).tokens().accessToken()).andExpect(status().isConflict());
        assertEquals(AuthAccount.Status.PENDING_VERIFICATION,other.getStatus());
    }
    @Test void lockedAccountStaysLocked() throws Exception {
        login();var a=accounts.findByEmail(email).orElseThrow();a.setStatus(AuthAccount.Status.LOCKED);accounts.flush();
        mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
    }
    @Test void selfRequiresSessionCsrfAndRejectsForgedFlag() throws Exception {
        var a=account(AuthAccount.Role.CUSTOMER,AuthAccount.Status.PENDING_VERIFICATION);String internal=auth.createSession(a).tokens().accessToken();
        mvc.perform(post("/api/v1/me/verifications/vneid").with(csrf().asHeader()).contentType("application/json")
                .content("{\"auth0AccessToken\":\""+token+"\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/me/verifications/vneid").header("Authorization","Bearer "+internal).contentType("application/json")
                .content("{\"auth0AccessToken\":\""+token+"\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/me/verifications/vneid").with(csrf().asHeader()).header("Authorization","Bearer "+internal).contentType("application/json")
                .content("{\"auth0AccessToken\":\""+token+"\",\"verified\":true}")).andExpect(status().isBadRequest());
    }
    @Test @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentRegistrationCreatesOnlyOneBindingAndAccount() throws Exception {
        var executor=java.util.concurrent.Executors.newFixedThreadPool(2);
        var barrier=new java.util.concurrent.CyclicBarrier(2);
        java.util.concurrent.Callable<Integer> call=()->{
            barrier.await(10,java.util.concurrent.TimeUnit.SECONDS);
            return mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader())
                    .header("Authorization","Bearer "+token).contentType("application/json").content(contactBody())).andReturn().getResponse().getStatus();
        };
        try {
            var first=executor.submit(call);var second=executor.submit(call);
            var statuses=List.of(first.get(30,java.util.concurrent.TimeUnit.SECONDS),second.get(30,java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(statuses.contains(200));assertTrue(statuses.stream().allMatch(s->s==200||s==409));
            transactions.executeWithoutResult(status->{
                var account=accounts.findByEmail(email).orElseThrow();
                assertEquals(account.getId(),identities.findByIssuerAndSubject("https://test.invalid/",subject).orElseThrow().getAccountId());
                assertEquals(1,identities.findAll().stream().filter(i->i.getSubject().equals(subject)).count());
            });
        } finally {
            executor.shutdownNow();executor.awaitTermination(10,java.util.concurrent.TimeUnit.SECONDS);
            transactions.executeWithoutResult(status->accounts.findByEmail(email).ifPresent(account->{
                Long id=account.getId();
                em.createNativeQuery("delete from auth_refresh_tokens where session_id in (select id from auth_sessions where account_id=:id)").setParameter("id",id).executeUpdate();
                em.createNativeQuery("delete from auth_sessions where account_id=:id").setParameter("id",id).executeUpdate();
                identities.deleteById(id);identities.flush();accounts.delete(account);accounts.flush();
            }));
        }
    }
    @Test void readsOwnVerifiedCitizenWithoutExposingExternalCredentials() throws Exception {
        login();var a=accounts.findByEmail(email).orElseThrow();String internal=auth.createSession(a).tokens().accessToken();
        mvc.perform(get("/api/v1/me/verifications").header("Authorization","Bearer "+internal))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.emailVerified").value(false)).andExpect(jsonPath("$.vneid.status").value("VERIFIED"))
                .andExpect(jsonPath("$.vneid.identity.documentNumber").value(number))
                .andExpect(jsonPath("$.vneid.identity.legalName").value("Người kiểm thử Auth0"))
                .andExpect(jsonPath("$.vneid.identity.dateOfBirth").value("1990-05-20"))
                .andExpect(jsonPath("$.vneid.verifiedAt").isNotEmpty())
                .andExpect(jsonPath("$.vneid.subject").doesNotExist()).andExpect(jsonPath("$.passwordHash").doesNotExist());
    }
    @Test void emailVerificationDoesNotInventVneidIdentity() throws Exception {
        var a=account(AuthAccount.Role.CUSTOMER,AuthAccount.Status.ACTIVE);a.setEmailVerified(true);accounts.flush();
        mvc.perform(get("/api/v1/me/verifications").header("Authorization","Bearer "+auth.createSession(a).tokens().accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.emailVerified").value(true))
                .andExpect(jsonPath("$.vneid.status").value("UNVERIFIED")).andExpect(jsonPath("$.vneid.identity").isEmpty());
    }
    @Test void guestAndOtherAccountsCannotReadCitizen() throws Exception {
        login();var own=accounts.findByEmail(email).orElseThrow();
        mvc.perform(get("/api/v1/me/verifications")).andExpect(status().isUnauthorized());
        email="other-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid";var other=account(AuthAccount.Role.OWNER,AuthAccount.Status.ACTIVE);
        mvc.perform(get("/api/v1/me/verifications").param("accountId",own.getId().toString())
                .header("Authorization","Bearer "+auth.createSession(other).tokens().accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.vneid.status").value("UNVERIFIED"))
                .andExpect(jsonPath("$.vneid.identity").isEmpty());
    }
    private org.springframework.test.web.servlet.ResultActions self(String internal) throws Exception {
        return mvc.perform(post("/api/v1/me/verifications/vneid").with(csrf().asHeader()).header("Authorization","Bearer "+internal)
                .contentType("application/json").content("{\"auth0AccessToken\":\""+token+"\"}"));
    }
    private String preview(String internal) throws Exception {
        String body=self(internal).andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("CONFIRMATION_REQUIRED"))
                .andExpect(jsonPath("$.documentNumber").doesNotExist()).andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(body,"$.confirmationId");
    }
    @Test void mismatchWaitsForExplicitConfirmationAndPreservesDisplayName() throws Exception {
        var a=account(AuthAccount.Role.CUSTOMER,AuthAccount.Status.PENDING_VERIFICATION);
        a.setFullName("Tên hiển thị khác");accounts.flush();String internal=auth.createSession(a).tokens().accessToken();
        String id=preview(internal);assertTrue(identities.findById(a.getId()).isEmpty());assertFalse(a.isIdentityVerified());
        assertEquals(AuthAccount.Status.PENDING_VERIFICATION,a.getStatus());
        mvc.perform(post("/api/v1/me/verifications/vneid/confirm").with(csrf().asHeader()).header("Authorization","Bearer "+internal)
                .contentType("application/json").content("{\"confirmationId\":\""+id+"\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountStatus").value("ACTIVE"));
        assertEquals("Tên hiển thị khác",a.getFullName());
        assertEquals("Người kiểm thử Auth0",identities.findById(a.getId()).orElseThrow().getLegalName());
        assertFalse(a.isEmailVerified());
    }
    @Test void cancelDoesNotBindAndCannotBeConfirmedLater() throws Exception {
        var a=account(AuthAccount.Role.CUSTOMER,AuthAccount.Status.PENDING_VERIFICATION);
        a.setFullName("Biệt danh");accounts.flush();String internal=auth.createSession(a).tokens().accessToken();String id=preview(internal);
        mvc.perform(post("/api/v1/me/verifications/vneid/cancel").with(csrf().asHeader()).header("Authorization","Bearer "+internal)
                .contentType("application/json").content("{\"confirmationId\":\""+id+"\"}")).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/me/verifications/vneid/confirm").with(csrf().asHeader()).header("Authorization","Bearer "+internal)
                .contentType("application/json").content("{\"confirmationId\":\""+id+"\"}")).andExpect(status().isConflict());
        assertTrue(identities.findById(a.getId()).isEmpty());assertEquals(AuthAccount.Status.PENDING_VERIFICATION,a.getStatus());
    }
    @Test void confirmationCommandsRequireCsrfAndRejectCitizenOverrides() throws Exception {
        var a=account(AuthAccount.Role.CUSTOMER,AuthAccount.Status.PENDING_VERIFICATION);
        String internal=auth.createSession(a).tokens().accessToken();
        for(String action:List.of("confirm","cancel"))mvc.perform(post("/api/v1/me/verifications/vneid/"+action)
                .header("Authorization","Bearer "+internal).contentType("application/json").content("{\"confirmationId\":\"forged\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/me/verifications/vneid/confirm").with(csrf().asHeader()).header("Authorization","Bearer "+internal)
                .contentType("application/json").content("{\"confirmationId\":\"forged\",\"legalName\":\"Forged\"}"))
                .andExpect(status().isBadRequest());assertTrue(identities.findById(a.getId()).isEmpty());
    }
    private AuthAccount account(AuthAccount.Role role,AuthAccount.Status status) {
        var a=new AuthAccount();a.setEmail(email);a.setFullName("Người kiểm thử Auth0");a.setRole(role);a.setStatus(status);
        return accounts.saveAndFlush(a);
    }
}
