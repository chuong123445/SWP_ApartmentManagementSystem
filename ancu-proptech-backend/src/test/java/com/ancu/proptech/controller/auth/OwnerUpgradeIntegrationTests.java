package com.ancu.proptech.controller.auth;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.service.auth.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.seed.enabled=false","app.billing.local-fixtures=false","app.auth.secure-cookie=false"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class OwnerUpgradeIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;
    @Autowired OwnerUpgradeRepository upgrades;@Autowired AuthService auth;
    @MockitoBean Auth0AssetReader assets;
    AuthAccount account;String token;String issuer="https://fixture.invalid/",subject;
    @BeforeEach void setup(){account=new AuthAccount();account.setEmail("upgrade-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");account.setFullName("Người kiểm thử nâng cấp");account.setRole(AuthAccount.Role.CUSTOMER);account.setStatus(AuthAccount.Status.ACTIVE);accounts.saveAndFlush(account);
        subject="auth0|"+com.ancu.proptech.support.TestIds.next();var identity=new ExternalIdentity();identity.setAccountId(account.getId());identity.setIssuer(issuer);identity.setSubject(subject);identity.setDocumentNumber(String.format("%012d",Math.abs(com.ancu.proptech.support.TestIds.next().longValue()%1000000000000L)));identity.setLegalName(account.getFullName());identity.setDateOfBirth(LocalDate.of(1990,1,1));identity.setGender("Nam");identity.setAddress("Đà Nẵng");identity.setSource(VneidTokenVerifier.SOURCE);identity.setVerificationStatus("VERIFIED");identity.setVerifiedAt(Instant.now());identities.saveAndFlush(identity);
        token=auth.createSession(account).tokens().accessToken();accounts.flush();when(assets.isConfigured()).thenReturn(true);when(assets.rentableAssets(issuer,subject)).thenReturn(List.of("asset-1"));}
    ResultActions upgrade(String body)throws Exception{return mvc.perform(post("/api/v1/me/owner-upgrade").with(csrf().asHeader()).header("Authorization","Bearer "+token).contentType("application/json").content(body));}
    String body(){return "{\"consent\":true,\"version\":"+account.getVersion()+"}";}
    @Test void oldEndpointCannotPromoteFromConsentAlone()throws Exception{upgrade(body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PROPERTY_ONBOARDING_REQUIRED"));assertEquals(AuthAccount.Role.CUSTOMER,account.getRole());assertFalse(upgrades.existsById(account.getId()));verify(assets,never()).rentableAssets(anyString(),anyString());}
    @Test void explicitSourceConsentKeepsCustomerAndDoesNotReadProvider()throws Exception{consent(body()).andExpect(status().isOk()).andExpect(jsonPath("$.consented").value(true));assertEquals(AuthAccount.Role.CUSTOMER,account.getRole());mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());verify(assets,never()).assetDetails(anyString(),anyString());}
    ResultActions consent(String body)throws Exception{return mvc.perform(post("/api/v1/me/property-source-consent").with(csrf().asHeader()).header("Authorization","Bearer "+token).contentType("application/json").content(body));}
    @Test void emailAloneCannotConsent()throws Exception{identities.deleteById(account.getId());identities.flush();account.setEmailVerified(true);accounts.flush();consent(body()).andExpect(status().isForbidden());}
    @Test void rejectsFalseConsentAndClientAuthority()throws Exception{consent("{\"consent\":false,\"version\":0}").andExpect(status().isBadRequest());consent(body().replace("}",",\"role\":\"OWNER\"}")).andExpect(status().isBadRequest());}
    @Test void consentRequiresSessionAndCsrf()throws Exception{mvc.perform(post("/api/v1/me/property-source-consent").with(csrf().asHeader()).contentType("application/json").content(body())).andExpect(status().isUnauthorized());mvc.perform(post("/api/v1/me/property-source-consent").header("Authorization","Bearer "+token).contentType("application/json").content(body())).andExpect(status().isForbidden());}
    @Test void staleVersionAndAdminCannotConsent()throws Exception{String old=body();account.setFullName("Updated");accounts.flush();consent(old).andExpect(status().isConflict());account.setRole(AuthAccount.Role.ADMIN);accounts.flush();consent(body()).andExpect(status().isForbidden());}
    @Test void existingOwnerIsNotDemoted()throws Exception{account.setRole(AuthAccount.Role.OWNER);accounts.flush();upgrade(body()).andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("OWNER"));}
    @Test void contextExposesNoCredentials()throws Exception{mvc.perform(get("/api/v1/me/owner-upgrade").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.identityVerified").value(true)).andExpect(jsonPath("$.clientSecret").doesNotExist());}
}
