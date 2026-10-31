package com.ancu.proptech.controller.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.service.auth.AuthService;
import com.ancu.proptech.service.escrow.EscrowService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class LegacyEscrowSecurityIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthService auth;
    @Autowired AuthAccountRepository accounts;
    @MockitoBean EscrowService escrow;

    @ParameterizedTest @EnumSource(AuthAccount.Role.class)
    void noRoleCanReadCreateOrReleaseLegacyEscrow(AuthAccount.Role role) throws Exception {
        var account = new AuthAccount();
        account.setEmail("escrow-guard-" + UUID.randomUUID() + "@example.invalid");
        account.setFullName("Kiểm thử khóa ký quỹ");
        account.setRole(role);
        account.setStatus(AuthAccount.Status.ACTIVE);
        account.setEmailVerified(true);
        account.setContactVerified(true);
        accounts.saveAndFlush(account);
        var bearer = "Bearer " + auth.createSession(account).tokens().accessToken();
        mvc.perform(get("/api/trustguard/escrow").header("Authorization", bearer))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/trustguard/escrow").header("Authorization", bearer)
            .contentType("application/json").content("{\"id\":99,\"contractId\":\"other-contract\",\"roomId\":\"other-room\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/trustguard/escrow/99/release").header("Authorization", bearer))
            .andExpect(status().isForbidden());
        verifyNoInteractions(escrow);
    }

    @Test void guestCannotReachLegacyEscrowService() throws Exception {
        mvc.perform(get("/api/trustguard/escrow")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/trustguard/escrow").contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/trustguard/escrow/99/release")).andExpect(status().isUnauthorized());
        verifyNoInteractions(escrow);
    }
}
