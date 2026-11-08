package com.ancu.proptech.controller.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.auth.EmailChangeChallenge;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.auth.EmailChangeChallengeRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AuthService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.seed.enabled=false", "app.billing.local-fixtures=false"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class AdminAccountIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired EmailChangeChallengeRepository challenges;
    @Autowired AuthService auth;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.ancu.proptech.service.property.ai.DossierAiClient dossierAiClient;
    private AuthAccount admin;
    private String adminToken;

    @BeforeEach void setup() {
        admin = account(AuthAccount.Role.ADMIN, AuthAccount.Status.ACTIVE);
        adminToken = token(admin);
    }

    private AuthAccount account(AuthAccount.Role role, AuthAccount.Status status) {
        var a = new AuthAccount();
        a.setEmail("admin-user-" + UUID.randomUUID() + "@example.invalid");
        a.setFullName("Tài khoản kiểm thử");
        a.setRole(role); a.setStatus(status); a.setEmailVerified(status == AuthAccount.Status.ACTIVE);
        return accounts.saveAndFlush(a);
    }
    private String token(AuthAccount account) { return auth.createSession(account).tokens().accessToken(); }
    private ResultActions command(String bearer, AuthAccount account, String action, long version) throws Exception {
        return mvc.perform(post("/api/v1/admin/accounts/" + account.getId() + "/actions")
                .header("Authorization", "Bearer " + bearer).contentType("application/json")
                .content("""
                    {"action":"%s","version":%d,"reason":"Yêu cầu kiểm thử"}
                    """.formatted(action, version)));
    }
    private ResultActions list(String filter, String email) throws Exception {
        return mvc.perform(get("/api/v1/admin/accounts").param("filter", filter).param("q", email)
                .header("Authorization", "Bearer " + adminToken));
    }
    private AuthAccount reload(AuthAccount account) {
        em.clear();
        return accounts.findById(account.getId()).orElseThrow();
    }

    @Test void onlyAdminCanListAndMutateAndAdminAccountsAreProtected() throws Exception {
        var user = account(AuthAccount.Role.CUSTOMER, AuthAccount.Status.ACTIVE);
        String userToken = token(user);
        mvc.perform(get("/api/v1/admin/accounts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/accounts").header("Authorization", "Bearer " + userToken)).andExpect(status().isForbidden());
        command(userToken, user, "DELETE", user.getVersion()).andExpect(status().isForbidden());
        command(adminToken, admin, "LOCK", admin.getVersion()).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_ACCOUNT_PROTECTED"));
        var otherAdmin = account(AuthAccount.Role.ADMIN, AuthAccount.Status.ACTIVE);
        command(adminToken, otherAdmin, "DELETE", otherAdmin.getVersion()).andExpect(status().isForbidden());
        list("ALL", user.getEmail()).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].id").value(user.getId().toString()))
                .andExpect(jsonPath("$.items[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.items[0].googleSubject").doesNotExist());
    }

    @Test void lockRevokesSessionsAndUnlockPreservesPendingVerification() throws Exception {
        var user = account(AuthAccount.Role.CUSTOMER, AuthAccount.Status.PENDING_VERIFICATION);
        String oldToken = token(user);
        command(adminToken, user, "LOCK", user.getVersion()).andExpect(status().isOk());
        var locked = reload(user);
        assertEquals(AuthAccount.Status.LOCKED, locked.getStatus());
        assertEquals(AuthAccount.Status.PENDING_VERIFICATION, locked.getLockedFromStatus());
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + oldToken)).andExpect(status().isUnauthorized());
        command(adminToken, locked, "UNLOCK", locked.getVersion()).andExpect(status().isOk());
        assertEquals(AuthAccount.Status.PENDING_VERIFICATION, reload(user).getStatus());
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + oldToken)).andExpect(status().isUnauthorized());
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM admin_account_events WHERE target_account_id=?", Integer.class, user.getId()));
    }

    @Test void adminProtectionAndManagementUseMembershipsInsteadOfLegacyProjection() throws Exception {
        var otherAdmin = account(AuthAccount.Role.ADMIN, AuthAccount.Status.ACTIVE);
        var customer = account(AuthAccount.Role.CUSTOMER, AuthAccount.Status.ACTIVE);
        String customerToken = token(customer);
        jdbc.update("UPDATE auth_accounts SET role='CUSTOMER' WHERE id IN (?,?)", admin.getId(), otherAdmin.getId());
        jdbc.update("UPDATE auth_accounts SET role='ADMIN' WHERE id=?", customer.getId());
        em.clear();
        list("ALL", otherAdmin.getEmail()).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].roles[0]").value("ADMIN"))
                .andExpect(jsonPath("$.items[0].canManage").value(false));
        for (String action : java.util.List.of("LOCK", "DELETE")) {
            command(adminToken, otherAdmin, action, otherAdmin.getVersion()).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("ADMIN_ACCOUNT_PROTECTED"));
        }
        mvc.perform(get("/api/v1/admin/accounts").header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
        list("ALL", customer.getEmail()).andExpect(jsonPath("$.items[0].roles[0]").value("CUSTOMER"))
                .andExpect(jsonPath("$.items[0].canManage").value(true));
        command(adminToken, customer, "LOCK", customer.getVersion()).andExpect(status().isOk());
    }

    @Test void staleCommandAndMissingReasonCannotChangeAnAccount() throws Exception {
        var user = account(AuthAccount.Role.CUSTOMER, AuthAccount.Status.ACTIVE);
        command(adminToken, user, "LOCK", user.getVersion() + 1).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/admin/accounts/" + user.getId() + "/actions").header("Authorization", "Bearer " + adminToken)
                .contentType("application/json").content("{\"action\":\"DELETE\",\"version\":0,\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());
        assertEquals(AuthAccount.Status.ACTIVE, reload(user).getStatus());
    }

    @Test void propertyOwnerIsSoftDeletedWithHistoryAndHiddenFromDefaultList() throws Exception {
        var owner = account(AuthAccount.Role.OWNER, AuthAccount.Status.ACTIVE);
        String oldToken = token(owner);
        var property = new Property();
        property.setOwner(owner); property.setName("Giữ lịch sử tài sản"); property.setAddress("Địa chỉ kiểm thử");
        property.setCity("Thành phố"); property.setDistrict("Quận"); property.setWard("Phường");
        property.setApprovalStatus(Property.ApprovalStatus.DRAFT);
        properties.saveAndFlush(property);
        list("ALL", owner.getEmail()).andExpect(jsonPath("$.items[0].roles[0]").value("OWNER"))
                .andExpect(jsonPath("$.items[0].roles[1]").value("CUSTOMER"));
        command(adminToken, owner, "DELETE", owner.getVersion()).andExpect(status().isOk()).andExpect(jsonPath("$.outcome").value("SOFT_DELETED"));
        var deleted = reload(owner);
        assertEquals(AuthAccount.Status.INACTIVE, deleted.getStatus());
        assertNotNull(deleted.getDeletedAt());
        assertTrue(properties.existsById(property.getId()));
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + oldToken)).andExpect(status().isUnauthorized());
        list("ALL", owner.getEmail()).andExpect(jsonPath("$.totalElements").value(0));
        list("DELETED", owner.getEmail()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].canManage").value(false));
        command(adminToken, deleted, "UNLOCK", deleted.getVersion()).andExpect(status().isConflict());
    }

    @Test void blankAccountIsHardDeletedWithOnlyItsTechnicalArtifacts() throws Exception {
        var user = account(AuthAccount.Role.OWNER, AuthAccount.Status.ACTIVE);
        String oldToken = token(user);
        var challenge = new EmailChangeChallenge();
        challenge.setAccount(user); challenge.setTargetEmail("target@example.invalid"); challenge.setCodeHash("a".repeat(64));
        challenge.setCreatedAt(Instant.now()); challenge.setExpiresAt(Instant.now().plusSeconds(600));
        challenges.saveAndFlush(challenge);
        var other = account(AuthAccount.Role.CUSTOMER, AuthAccount.Status.ACTIVE);
        String otherToken = token(other);
        command(adminToken, user, "DELETE", user.getVersion()).andExpect(status().isOk()).andExpect(jsonPath("$.outcome").value("HARD_DELETED"));
        em.clear();
        assertFalse(accounts.existsById(user.getId()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM auth_account_roles WHERE account_id=?", Integer.class, user.getId()));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM auth_roles", Integer.class));
        assertFalse(challenges.existsById(challenge.getId()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM auth_sessions WHERE account_id=?", Integer.class, user.getId()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM admin_account_events WHERE target_account_id=? AND outcome='HARD_DELETED'", Integer.class, user.getId()));
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + oldToken)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + otherToken)).andExpect(status().isOk());
    }

    @Test void concurrentCommandsCannotBothApplyTheSameVersion() throws Exception {
        var user = account(AuthAccount.Role.CUSTOMER, AuthAccount.Status.ACTIVE);
        Long targetId = user.getId();
        long version = user.getVersion();
        org.springframework.test.context.transaction.TestTransaction.flagForCommit();
        org.springframework.test.context.transaction.TestTransaction.end();
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try {
            java.util.concurrent.Callable<Integer> task = () -> {
                start.await();
                return command(adminToken, user, "LOCK", version).andReturn().getResponse().getStatus();
            };
            var a = pool.submit(task);
            var b = pool.submit(task);
            start.countDown();
            var results = java.util.List.of(a.get(20, java.util.concurrent.TimeUnit.SECONDS), b.get(20, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(results.contains(200));
            assertTrue(results.contains(409));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM admin_account_events WHERE target_account_id=?", Integer.class, targetId));
        } finally {
            pool.shutdownNow();
            jdbc.update("DELETE FROM admin_account_events WHERE actor_id=?", admin.getId());
            for (Long id : java.util.List.of(targetId, admin.getId())) {
                jdbc.update("DELETE FROM auth_refresh_tokens WHERE session_id IN (SELECT id FROM auth_sessions WHERE account_id=?)", id);
                jdbc.update("DELETE FROM auth_sessions WHERE account_id=?", id);
                jdbc.update("DELETE FROM auth_account_roles WHERE account_id=?", id);
                jdbc.update("DELETE FROM auth_accounts WHERE id=?", id);
            }
        }
    }
    @Test void historyWithoutAnExistingForeignKeyStillPreventsHardDeletion() throws Exception {
        var user = account(AuthAccount.Role.CUSTOMER, AuthAccount.Status.ACTIVE);
        jdbc.execute("CREATE TABLE dbo.admin_deletion_guard_test (id bigint IDENTITY PRIMARY KEY, owner_id bigint NOT NULL)");
        jdbc.update("INSERT INTO dbo.admin_deletion_guard_test(owner_id) VALUES (?)", user.getId());
        command(adminToken, user, "DELETE", user.getVersion()).andExpect(status().isOk()).andExpect(jsonPath("$.outcome").value("SOFT_DELETED"));
        assertNotNull(reload(user).getDeletedAt());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM admin_deletion_guard_test WHERE owner_id=?", Integer.class, user.getId()));
    }
}
