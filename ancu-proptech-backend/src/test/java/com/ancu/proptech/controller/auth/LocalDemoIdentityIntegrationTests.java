package com.ancu.proptech.controller.auth;

import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.service.auth.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.seed.enabled=false","app.billing.local-fixtures=false","app.admin.local-provisioning=false"})
@AutoConfigureMockMvc @ActiveProfiles({"local","test"}) @Transactional
class LocalDemoIdentityIntegrationTests {
    @Autowired AuthAccountRepository accounts;
    @Autowired ExternalIdentityRepository identities;
    @Autowired AuthService auth;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @org.springframework.test.context.bean.override.mockito.MockitoBean com.ancu.proptech.service.property.ai.DossierAiClient ai;

    @Test void localIdentityIsPrivateAndVerifiedWithoutClaimingAuth0OrChangingContactFlags() throws Exception {
        var a=new AuthAccount();a.setEmail("local-identity-"+UUID.randomUUID()+"@example.invalid");
        a.setFullName("Nguyễn Minh Tuấn");a.setRole(AuthAccount.Role.CUSTOMER);a.setStatus(AuthAccount.Status.ACTIVE);
        accounts.saveAndFlush(a);
        var i=new ExternalIdentity();i.setAccountId(a.getId());i.setIssuer("urn:ancu:local-demo");i.setSubject(a.getId().toString());
        i.setSource("LOCAL_DEMO");i.setVerificationStatus("VERIFIED");i.setVerifiedAt(Instant.now());
        i.setDocumentNumber(String.format(Locale.ROOT,"0%011d",Math.floorMod(UUID.randomUUID().getLeastSignificantBits(),100_000_000_000L)));
        i.setLegalName(a.getFullName());i.setDateOfBirth(LocalDate.of(1998,10,29));i.setGender("Nam");
        i.setAddress("18 đường số 5, phường Hiệp Bình, TP. Hồ Chí Minh");i.setDocumentIssueDate(LocalDate.of(2021,8,20));
        i.setDocumentIssuePlace("Cục Cảnh sát quản lý hành chính về trật tự xã hội");i.setPermanentAddress(i.getAddress());
        identities.saveAndFlush(i);
        String token=auth.createSession(a).tokens().accessToken();
        mvc.perform(get("/api/v1/me/verifications").header("Authorization","Bearer "+token)).andExpect(status().isOk())
            .andExpect(jsonPath("$.emailVerified").value(false)).andExpect(jsonPath("$.vneid.status").value("VERIFIED"))
            .andExpect(jsonPath("$.vneid.source").value("LOCAL_DEMO"))
            .andExpect(jsonPath("$.vneid.identity.legalName").value(a.getFullName()))
            .andExpect(jsonPath("$.vneid.identity.documentIssuePlace").value(i.getDocumentIssuePlace()));
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+token)).andExpect(status().isOk())
            .andExpect(jsonPath("$.contactVerificationStatus").value("VERIFIED"));
        mvc.perform(get("/api/v1/me/verifications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        var row=jdbc.queryForMap("SELECT * FROM dbo.vw_account_roles WHERE account_id=?",a.getId());
        assertEquals("LOCAL_DEMO",row.get("identity_source"));assertEquals(true,row.get("identity_is_local_fixture"));
        assertFalse(a.isEmailVerified());assertFalse(a.isPhoneVerified());
    }
}
