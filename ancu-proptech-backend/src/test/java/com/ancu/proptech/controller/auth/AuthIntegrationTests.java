package com.ancu.proptech.controller.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.service.auth.AuthService;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.auth.secure-cookie=false")
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class AuthIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtEncoder jwtEncoder;
    @Autowired JwtDecoder jwtDecoder;
    private AuthAccount owner;
    private final String password = "Auth-test-only!123";
    private record Login(String accessToken, Cookie refresh) {}

    @BeforeEach void fixture() {
        owner = new AuthAccount();
        owner.setEmail("auth-test-" + UUID.randomUUID() + "@example.invalid");
        owner.setFullName("Chủ nhà kiểm thử");
        owner.setPasswordHash(passwords.encode(password));
        owner.setRole(AuthAccount.Role.OWNER);
        owner.setStatus(AuthAccount.Status.ACTIVE);
        owner.setContactVerified(true);owner.setEmailVerified(true);
        accounts.saveAndFlush(owner);
    }

    private Login login(String email, String pass) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login").with(csrf().asHeader())
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + pass + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.tokenType").value("Bearer")).andReturn();
        Cookie cookie = result.getResponse().getCookie(AuthController.REFRESH_COOKIE);
        assertNotNull(cookie);
        assertTrue(cookie.isHttpOnly());
        assertEquals("/api/v1/auth", cookie.getPath());
        assertTrue(result.getResponse().getHeaders("Set-Cookie").stream().anyMatch(value -> value.contains("SameSite=Lax")));
        return new Login(JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken"), cookie);
    }

    @Test void loginReadsSqlAccountAndProtectsOwnerApi() throws Exception {
        Login login = login(owner.getEmail().toUpperCase(Locale.ROOT), password);
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + login.accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(owner.getEmail()))
                .andExpect(jsonPath("$.roles[0]").value("OWNER"));
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization", "Bearer " + login.accessToken())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/owner/apartments")).andExpect(status().isUnauthorized());
    }

    @Test void wrongPasswordAndUnknownAccountHaveSameError() throws Exception {
        for (String email : List.of(owner.getEmail(), "missing@example.invalid")) {
            mvc.perform(post("/api/v1/auth/login").with(csrf().asHeader()).contentType("application/json")
                            .content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }
    }

    @Test void csrfIsRequiredAndBrowserCanObtainToken() throws Exception {
        mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty()).andExpect(jsonPath("$.headerName").isNotEmpty());
        for (String action : List.of("login", "refresh", "logout")) {
            mvc.perform(post("/api/v1/auth/" + action).contentType("application/json")
                    .content("{\"email\":\"" + owner.getEmail() + "\",\"password\":\"" + password + "\"}"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test void logoutRevokesAlreadyIssuedJwtAndRefreshCookie() throws Exception {
        Login login = login(owner.getEmail(), password);
        mvc.perform(post("/api/v1/auth/logout").with(csrf().asHeader()).cookie(login.refresh()))
                .andExpect(status().isNoContent()).andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE, 0));
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + login.accessToken())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf().asHeader()).cookie(login.refresh())).andExpect(status().isUnauthorized());
    }

    @Test void refreshRotatesAndReuseRevokesTheWholeSession() throws Exception {
        Login login = login(owner.getEmail(), password);
        MvcResult refreshed = mvc.perform(post("/api/v1/auth/refresh").with(csrf().asHeader()).cookie(login.refresh()))
                .andExpect(status().isOk()).andReturn();
        Cookie rotated = refreshed.getResponse().getCookie(AuthController.REFRESH_COOKIE);
        assertNotNull(rotated);
        assertNotEquals(login.refresh().getValue(), rotated.getValue());
        String access = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.accessToken");
        mvc.perform(post("/api/v1/auth/refresh").with(csrf().asHeader()).cookie(login.refresh())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf().asHeader()).cookie(rotated)).andExpect(status().isUnauthorized());
    }

    @Test void lockedAndInactiveAccountsCannotLogin() throws Exception {
        for (AuthAccount.Status state : List.of(AuthAccount.Status.LOCKED, AuthAccount.Status.INACTIVE)) {
            owner.setStatus(state);
            accounts.saveAndFlush(owner);
            mvc.perform(post("/api/v1/auth/login").with(csrf().asHeader()).contentType("application/json")
                    .content("{\"email\":\"" + owner.getEmail() + "\",\"password\":\"" + password + "\"}"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test void pendingOwnerAndCustomerCannotAcquireManagerAuthority() throws Exception {
        owner.setStatus(AuthAccount.Status.PENDING_VERIFICATION);
        owner.setContactVerified(false);owner.setEmailVerified(false);
        accounts.saveAndFlush(owner);
        Login pending = login(owner.getEmail(), password);
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + pending.accessToken())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization", "Bearer " + pending.accessToken())).andExpect(status().isForbidden());
        owner.setStatus(AuthAccount.Status.ACTIVE);
        owner.setContactVerified(true);owner.setEmailVerified(true);
        owner.setRole(AuthAccount.Role.CUSTOMER);
        accounts.saveAndFlush(owner);
        Login customer = login(owner.getEmail(), password);
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization", "Bearer " + customer.accessToken())).andExpect(status().isForbidden());
    }

    @Test void accountLockAndExpiredOrTamperedJwtTakeEffectImmediately() throws Exception {
        Login login = login(owner.getEmail(), password);
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + login.accessToken() + "tampered"))
                .andExpect(status().isUnauthorized());
        Jwt original = jwtDecoder.decode(login.accessToken());
        JwtClaimsSet expired = JwtClaimsSet.builder().issuer(AuthService.ISSUER).audience(List.of(AuthService.AUDIENCE))
                .subject(original.getSubject()).claim("sid", original.getClaimAsString("sid"))
                .issuedAt(Instant.now().minusSeconds(600)).expiresAt(Instant.now().minusSeconds(120)).build();
        String expiredToken = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), expired)).getTokenValue();
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + expiredToken)).andExpect(status().isUnauthorized());
        owner.setStatus(AuthAccount.Status.LOCKED);
        accounts.saveAndFlush(owner);
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + login.accessToken())).andExpect(status().isUnauthorized());
    }
}
