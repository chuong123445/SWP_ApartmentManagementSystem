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
    @MockitoBean VneidTokenVerifier verifier;
    String token,email,subject,number;
    Jwt external;
    @BeforeEach void setup() {
        token="external-"+UUID.randomUUID();email="vneid-"+UUID.randomUUID()+"@example.invalid";subject="auth0|"+UUID.randomUUID();
        number=String.format("%012d",Math.abs(UUID.randomUUID().getMostSignificantBits()%1000000000000L));
        external=claims("20/05/1990");when(verifier.decode(token)).thenReturn(external);
    }
    Jwt claims(String dob) {
        return Jwt.withTokenValue(token).header("alg","RS256").subject(subject).issuer("https://test.invalid/")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(600))
                .claim(VneidTokenVerifier.NS+"cccd_number",number).claim(VneidTokenVerifier.NS+"full_name","Người kiểm thử Auth0")
                .claim(VneidTokenVerifier.NS+"dob",dob).claim(VneidTokenVerifier.NS+"gender","Nam")
                .claim(VneidTokenVerifier.NS+"address","Đà Nẵng").claim(VneidTokenVerifier.NS+"email",email).build();
    }
    String login() throws Exception {
        return mvc.perform(post("/api/v1/auth/vneid-login").with(csrf().asHeader()).header("Authorization","Bearer "+token))
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
        login();email="other-"+UUID.randomUUID()+"@example.invalid";
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
    private org.springframework.test.web.servlet.ResultActions self(String internal) throws Exception {
        return mvc.perform(post("/api/v1/me/verifications/vneid").with(csrf().asHeader()).header("Authorization","Bearer "+internal)
                .contentType("application/json").content("{\"auth0AccessToken\":\""+token+"\"}"));
    }
    private AuthAccount account(AuthAccount.Role role,AuthAccount.Status status) {
        var a=new AuthAccount();a.setEmail(email);a.setFullName("Tài khoản kiểm thử");a.setRole(role);a.setStatus(status);
        return accounts.saveAndFlush(a);
    }
}
