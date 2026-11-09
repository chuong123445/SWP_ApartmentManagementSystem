package com.ancu.proptech.controller.property;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AuthService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PropertyListingIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AuthAccountRepository accounts;
    @Autowired ExternalIdentityRepository identities;
    @Autowired PropertyListingDraftRepository drafts;
    @Autowired PropertyRepository properties;
    @Autowired PasswordEncoder passwords;
    @Autowired AuthService auth;
    private String token;
    private String otherToken;
    private AuthAccount actor;
    private static String passwordHash;

    @BeforeEach void setup(){
        if(passwordHash==null)passwordHash=passwords.encode("Listing-test!1234");
        actor=account();
        token=auth.login(actor.getEmail(),"Listing-test!1234").tokens().accessToken();
        var other=account();otherToken=auth.login(other.getEmail(),"Listing-test!1234").tokens().accessToken();
    }
    private AuthAccount account(){
        var account=new AuthAccount();account.setEmail(UUID.randomUUID()+"@example.invalid");account.setFullName("Listing test");
        account.setRole(AuthAccount.Role.CUSTOMER);account.setStatus(AuthAccount.Status.ACTIVE);account.setPasswordHash(passwordHash);
        account.setEmailVerified(true);account.setContactVerified(true);accounts.saveAndFlush(account);
        com.ancu.proptech.support.VerifiedIdentityFixtures.bind(identities,account);
        return account;
    }
    private String start(String key)throws Exception{
        return mvc.perform(post("/api/v1/me/listing-drafts").header("Authorization","Bearer "+token)
                .contentType("application/json").content(json.writeValueAsString(Map.of("requestKey",key,"rightType","AUTHORIZATION"))))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andReturn().getResponse().getContentAsString();
    }
    @Test void createsOnceResumesPrivatelyAndRejectsStaleSave()throws Exception{
        String key=UUID.randomUUID().toString();var created=json.readTree(start(key));String id=created.path("propertyId").asString();
        assertEquals(id,json.readTree(start(key)).path("propertyId").asString());
        assertFalse(actor.hasRole(AuthAccount.Role.OWNER));
        String route="/api/v1/me/listing-drafts/"+id;
        mvc.perform(get(route).header("Authorization","Bearer "+otherToken)).andExpect(status().isNotFound());
        var saved=mvc.perform(put(route).header("Authorization","Bearer "+token).contentType("application/json")
                .content("{\"version\":0,\"payload\":{\"step\":1,\"name\":\"Nhà đã lưu\"}}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andReturn();
        mvc.perform(get(route).header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.name").value("Nhà đã lưu"));
        mvc.perform(put(route).header("Authorization","Bearer "+token).contentType("application/json")
                .content("{\"version\":0,\"payload\":{}}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));
        assertFalse(drafts.findById(Long.valueOf(id)).orElseThrow().isCompleted());
        assertEquals("DRAFT",properties.findById(Long.valueOf(id)).orElseThrow().getApprovalStatus().name());
    }
    @Test void rejectsMissingVersionAndIncompleteFinalCommand()throws Exception{
        String id=json.readTree(start(UUID.randomUUID().toString())).path("propertyId").asString();
        mvc.perform(put("/api/v1/me/listing-drafts/"+id).header("Authorization","Bearer "+token)
                .contentType("application/json").content("{\"payload\":{}}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/me/listing-drafts/"+id+"/complete").header("Authorization","Bearer "+token)
                .contentType("application/json").content("{\"version\":0,\"property\":{},\"dossier\":{},\"submit\":true}"))
                .andExpect(status().isBadRequest());
        assertFalse(drafts.findById(Long.valueOf(id)).orElseThrow().isCompleted());
    }
}
