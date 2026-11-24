package com.ancu.proptech.controller.property;

import com.ancu.proptech.dto.property.VneidAsset;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.service.auth.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.seed.enabled=false","app.billing.local-fixtures=false","app.auth.secure-cookie=false"})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class VneidPropertyImportIntegrationTests {
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.ancu.proptech.service.property.ai.DossierAiClient dossierAiClient;
    @Autowired com.ancu.proptech.repository.property.PropertyImageRepository imageFiles;
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;
    @Autowired PropertyExternalImportRepository imports;@Autowired PropertyRepository properties;@Autowired ApartmentRepository apartments;
    @Autowired PropertySourceConsentRepository consents;
    @Autowired PropertySourceUnitRepository sourceUnits;
    @Autowired PropertySourceImportBatchRepository batches;
    @Autowired com.ancu.proptech.service.contract.ContractPropertyEvidenceResolver evidenceResolver;
    @Autowired javax.sql.DataSource dataSource;
    @Autowired AuthService auth;@Autowired ObjectMapper json;@Autowired EntityManager em;
    @MockitoBean Auth0AssetReader assets;
    AuthAccount owner;String token;String issuer="https://asset-fixture.invalid/",subject,assetId;
    VneidAsset source;
    @BeforeEach void setup(){
        owner=new AuthAccount();owner.setEmail("import-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");owner.setFullName("Chủ nhà kiểm thử");owner.setRole(AuthAccount.Role.OWNER);owner.setStatus(AuthAccount.Status.ACTIVE);accounts.saveAndFlush(owner);
        subject="auth0|"+com.ancu.proptech.support.TestIds.next();assetId="asset-"+com.ancu.proptech.support.TestIds.next();var i=new ExternalIdentity();i.setAccountId(owner.getId());i.setIssuer(issuer);i.setSubject(subject);
        i.setDocumentNumber(String.format("%012d",Math.abs(com.ancu.proptech.support.TestIds.next().longValue()%1000000000000L)));i.setLegalName(owner.getFullName());i.setDateOfBirth(LocalDate.of(1990,1,1));i.setGender("Nam");i.setAddress("Đà Nẵng");i.setSource(VneidTokenVerifier.SOURCE);i.setVerificationStatus("VERIFIED");i.setVerifiedAt(Instant.now());identities.saveAndFlush(i);
        var consent=new com.ancu.proptech.model.property.PropertySourceConsent();consent.setAccountId(owner.getId());consent.setIssuer(issuer);consent.setSubject(subject);consent.setConsentedAt(Instant.now());consent.setConsentVersion("property-selection-v2");consents.saveAndFlush(consent);
        token=auth.createSession(owner).tokens().accessToken();accounts.flush();
        source=new VneidAsset(assetId,"Tài sản nguồn kiểm thử "+assetId,"12 Đường nguồn","SINGLE_UNIT","CERT-"+assetId,null,null,List.of(new VneidAsset.Unit("unit-1","A.01",new BigDecimal("50.25"),2,1)));

    }
    @Test void ownerAndCustomerCannotReadOrImportAssetsDespiteVerifiedIdentityAndOldConsent()throws Exception {
        long count=properties.count();
        for(var role:List.of(AuthAccount.Role.OWNER,AuthAccount.Role.CUSTOMER)) {
            owner.setRole(role);accounts.flush();
            mvc.perform(get("/api/v1/owner/properties/vneid-assets").header("Authorization","Bearer "+token))
                .andExpect(status().isGone()).andExpect(jsonPath("$.code").value("PROPERTY_SOURCE_RETIRED"));
            var body="{\"externalAssetId\":\"retired\",\"sourceVersion\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"city\":\"HCM\",\"district\":\"TD\",\"imageIds\":[\"1\"],\"units\":[{\"externalUnitId\":\"u\",\"imageIds\":[\"1\"],\"monthlyRent\":4500000,\"deposit\":0,\"electricityUnitPrice\":3500,\"waterUnitPrice\":15000,\"electricityIndex\":0,\"waterIndex\":0,\"floor\":1,\"maxOccupants\":2,\"description\":\"Test\"}]}";
            mvc.perform(post("/api/v1/owner/properties/vneid-imports").header("Authorization","Bearer "+token).contentType("application/json").content(body)).andExpect(status().isGone());
            mvc.perform(post("/api/v1/owner/properties/1/vneid-units").header("Authorization","Bearer "+token).contentType("application/json").content("{\"version\":0,\"sourceVersion\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"units\":[{\"externalUnitId\":\"u\",\"imageIds\":[\"1\"],\"monthlyRent\":4500000,\"deposit\":0,\"electricityUnitPrice\":3500,\"waterUnitPrice\":15000,\"electricityIndex\":0,\"waterIndex\":0,\"floor\":1,\"maxOccupants\":2,\"description\":\"Test\"}]}" )).andExpect(status().isGone());
        }
        assertEquals(count,properties.count());verifyNoInteractions(assets);
    }
    @Test void ordinaryAccountAlsoCannotUseRetiredSource()throws Exception {
        identities.deleteById(owner.getId());identities.flush();
        mvc.perform(get("/api/v1/owner/properties/vneid-assets").header("Authorization","Bearer "+token)).andExpect(status().isGone());
        mvc.perform(get("/api/v1/me/property-source-consent").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.consented").value(false)).andExpect(jsonPath("$.assetServiceAvailable").value(false));
        verifyNoInteractions(assets);
    }
}
