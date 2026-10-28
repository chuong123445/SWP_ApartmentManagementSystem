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
    @Test void promotesAfterServerReadAndRetryDoesNotReadAgain()throws Exception{String original=body();upgrade(original).andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("OWNER"));assertEquals(1,upgrades.findById(account.getId()).orElseThrow().getEligibleAssetCount());assertFalse(account.isEmailVerified());upgrade(original).andExpect(status().isOk());verify(assets,times(1)).rentableAssets(issuer,subject);mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+token)).andExpect(status().isOk());}
    @Test void ownerRetainsSelfRentalHistoryAfterUpgrade()throws Exception{upgrade(body()).andExpect(status().isOk());for(String path:List.of("/api/v1/me/rental-requests","/api/v1/me/invoices","/api/v1/me/contract-drafts"))mvc.perform(get(path).header("Authorization","Bearer "+token)).andExpect(status().isOk());}
    @Test void emptyAssetsDoNotPromote()throws Exception{when(assets.rentableAssets(issuer,subject)).thenReturn(List.of());upgrade(body()).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNER_ASSET_REQUIRED"));assertEquals(AuthAccount.Role.CUSTOMER,account.getRole());assertFalse(upgrades.existsById(account.getId()));}
    @Test void missingVerificationCannotUseEmailAsAssetIdentity()throws Exception{identities.deleteById(account.getId());identities.flush();account.setEmailVerified(true);accounts.flush();upgrade(body()).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("VNEID_REQUIRED"));verify(assets,never()).rentableAssets(anyString(),anyString());}
    @Test void rejectsFalseConsentAndClientAssetAuthority()throws Exception{upgrade("{\"consent\":false,\"version\":0}").andExpect(status().isBadRequest());upgrade(body().replace("}",",\"assetCount\":1}")).andExpect(status().isBadRequest());verify(assets,never()).rentableAssets(anyString(),anyString());}
    @Test void requiresSessionAndCsrf()throws Exception{mvc.perform(post("/api/v1/me/owner-upgrade").with(csrf().asHeader()).contentType("application/json").content(body())).andExpect(status().isUnauthorized());mvc.perform(post("/api/v1/me/owner-upgrade").header("Authorization","Bearer "+token).contentType("application/json").content(body())).andExpect(status().isForbidden());}
    @Test void unavailableProviderDoesNotGrantOwner()throws Exception{when(assets.rentableAssets(issuer,subject)).thenThrow(AccountService.error(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"ASSET_SOURCE_UNAVAILABLE","Unavailable"));upgrade(body()).andExpect(status().isServiceUnavailable());assertEquals(AuthAccount.Role.CUSTOMER,account.getRole());assertFalse(upgrades.existsById(account.getId()));}
    @Test void staleVersionDoesNotGrantOwner()throws Exception{String old=body();account.setFullName("Tên thay đổi");accounts.flush();upgrade(old).andExpect(status().isConflict());assertFalse(upgrades.existsById(account.getId()));}
    @Test void adminIsNotConverted()throws Exception{account.setRole(AuthAccount.Role.ADMIN);accounts.flush();upgrade(body()).andExpect(status().isForbidden());verify(assets,never()).rentableAssets(anyString(),anyString());}
    @Test void contextExposesNoManagementCredentialsOrAssetData()throws Exception{mvc.perform(get("/api/v1/me/owner-upgrade").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.identityVerified").value(true)).andExpect(jsonPath("$.assetServiceAvailable").value(true)).andExpect(jsonPath("$.clientSecret").doesNotExist());verify(assets,never()).rentableAssets(anyString(),anyString());}
}
