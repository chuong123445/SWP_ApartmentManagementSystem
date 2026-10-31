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
    @Autowired com.ancu.proptech.repository.property.PropertyImageRepository imageFiles;
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;
    @Autowired PropertyExternalImportRepository imports;@Autowired PropertyRepository properties;@Autowired ApartmentRepository apartments;
    @Autowired PropertySourceConsentRepository consents;
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
        source=new VneidAsset(assetId,"Tài sản nguồn kiểm thử","12 Đường nguồn","SINGLE_UNIT","CERT-TEST",null,null,List.of(new VneidAsset.Unit("unit-1","A.01",new BigDecimal("50.25"),2,1)));
        when(assets.assetDetails(issuer,subject)).thenReturn(List.of(source));
    }
    ResultActions list()throws Exception{return mvc.perform(get("/api/v1/owner/properties/vneid-assets").header("Authorization","Bearer "+token));}
    String version()throws Exception{return json.readTree(list().andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get(0).get("sourceVersion").asText();}
    String unit(){return "{\"externalUnitId\":\"unit-1\",\"monthlyRent\":\"4500000\",\"deposit\":\"4500000\",\"electricityUnitPrice\":\"3500\",\"waterUnitPrice\":\"15000\",\"electricityIndex\":120,\"waterIndex\":30,\"floor\":2,\"maxOccupants\":4,\"description\":\"Thông tin cho thuê\"}";}
    String body(String version){return "{\"imageIds\":[\""+com.ancu.proptech.support.PropertyImageFixtures.stage(imageFiles,owner.getId())+"\"],\"externalAssetId\":\""+assetId+"\",\"sourceVersion\":\""+version+"\",\"city\":\"Đà Nẵng\",\"district\":\"Hải Châu\",\"units\":["+unit()+"]}";}
    ResultActions submit(String body)throws Exception{return mvc.perform(post("/api/v1/owner/properties/vneid-imports").header("Authorization","Bearer "+token).contentType("application/json").content(body));}
    @Test void importsAndPublishesWithSourceAuditWithoutAdminOrManualIdentity()throws Exception{
        String version=version();list().andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$[0].imported").value(false));
        var response=submit(body(version)).andExpect(status().isCreated()).andExpect(jsonPath("$.property.approvalStatus").value("APPROVED"))
            .andExpect(jsonPath("$.property.address").value(source.address())).andExpect(jsonPath("$.apartments[0].publicationStatus").value("PUBLISHED"))
            .andExpect(jsonPath("$.apartments[0].electricityUnitPrice").value("3500.00")).andReturn();
        var root=json.readTree(response.getResponse().getContentAsString());Long id=Long.valueOf(root.get("property").get("id").asText());
        assertEquals(VneidTokenVerifier.SOURCE,imports.findById(id).orElseThrow().getSource());assertEquals(version,imports.findById(id).orElseThrow().getSourceVersion());
        String apartmentId=root.get("apartments").get(0).get("id").asText();
        mvc.perform(get("/api/v1/apartments/"+apartmentId)).andExpect(status().isOk()).andExpect(jsonPath("$.waterUnitPrice").value("15000.00"))
            .andExpect(jsonPath("$.certificateNumber").doesNotExist()).andExpect(jsonPath("$.subject").doesNotExist());
        mvc.perform(get("/api/v1/apartments").param("q",source.name())).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/apartments/address-options")).andExpect(status().isOk());
        list().andExpect(jsonPath("$[0].imported").value(true));
        mvc.perform(post("/api/v1/owner/apartments").header("Authorization","Bearer "+token).contentType("application/json").content("{\"propertyId\":\""+id+"\",\"roomNumber\":\"FAKE-UNIT\",\"title\":\"Căn tự thêm\",\"floor\":0,\"areaM2\":30,\"advertisedMonthlyRent\":3000000}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOURCE_UNITS_MANAGED"));
        mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+token)).andExpect(jsonPath("$[?(@.id == '"+id+"')].verificationSource").value(org.hamcrest.Matchers.contains(VneidTokenVerifier.SOURCE)));
    }
    @Test void multiUnitImportPublishesEveryExactSourceUnit()throws Exception{
        source=new VneidAsset(assetId,source.name(),source.address(),"MULTI_UNIT","CERT-TEST",null,null,List.of(source.units().get(0),new VneidAsset.Unit("unit-2","A.02",new BigDecimal("35"),1,1)));
        when(assets.assetDetails(issuer,subject)).thenReturn(List.of(source));String body=body(version()).replace(unit(),unit()+","+unit().replace("unit-1","unit-2"));
        submit(body).andExpect(status().isCreated()).andExpect(jsonPath("$.apartments.length()").value(2)).andExpect(jsonPath("$.apartments[1].publicationStatus").value("PUBLISHED"));
    }
    @Test void duplicateImportDoesNotCreateAnotherProperty()throws Exception{String body=body(version());submit(body).andExpect(status().isCreated());long before=properties.count();submit(body).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ASSET_ALREADY_IMPORTED"));assertEquals(before,properties.count());}
    @Test void cannotSelectAnotherAccountsAsset()throws Exception{String body=body(version()).replace(assetId,"other-person-asset");submit(body).andExpect(status().isNotFound());assertFalse(imports.existsByIssuerAndExternalAssetId(issuer,assetId));}
    @Test void staleSourceDoesNotPublish()throws Exception{String v=version();when(assets.assetDetails(issuer,subject)).thenReturn(List.of(new VneidAsset(assetId,"Tên đã đổi",source.address(),"SINGLE_UNIT","CERT-TEST",null,null,source.units())));submit(body(v)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ASSET_SOURCE_CHANGED"));}
    @Test void sourceRemovedCannotUsePreviousPreview()throws Exception{String v=version();when(assets.assetDetails(issuer,subject)).thenReturn(List.of());submit(body(v)).andExpect(status().isNotFound());}
    @Test void refusesClientAuthorityAndMissingPrice()throws Exception{String body=body(version());submit(body.replace("}",",\"approvalStatus\":\"APPROVED\"}")).andExpect(status().isBadRequest());submit(body.replace("\"electricityUnitPrice\":\"3500\",","")).andExpect(status().isBadRequest());submit(body.replace("\"monthlyRent\":\"4500000\"","\"monthlyRent\":\"0\"")).andExpect(status().isBadRequest());}
    @Test void exactUnitSetIsRequired()throws Exception{String body=body(version());submit(body.replace("unit-1","unit-for-other-asset")).andExpect(status().isBadRequest());submit(body.replace(unit(),unit()+","+unit())).andExpect(status().isBadRequest());}
    @Test void missingVneidDoesNotFallBackToEmail()throws Exception{identities.deleteById(owner.getId());identities.flush();owner.setEmailVerified(true);accounts.flush();list().andExpect(status().isForbidden());verify(assets,never()).assetDetails(anyString(),anyString());}
    @Test void customerPromotedOnlyAfterSuccessfulImportAndLockedOwnerCannotImport()throws Exception{owner.setRole(AuthAccount.Role.CUSTOMER);accounts.flush();String v=version();assertEquals(AuthAccount.Role.CUSTOMER,owner.getRole());submit(body(v)).andExpect(status().isCreated());assertEquals(AuthAccount.Role.OWNER,accounts.findById(owner.getId()).orElseThrow().getRole());owner=accounts.findById(owner.getId()).orElseThrow();owner.setStatus(AuthAccount.Status.LOCKED);accounts.flush();list().andExpect(status().isUnauthorized());}
    @Test void failedCustomerImportAndMissingConsentNeverGrantOwner()throws Exception{owner.setRole(AuthAccount.Role.CUSTOMER);accounts.flush();String v=version();submit(body(v).replace("\"monthlyRent\":\"4500000\"","\"monthlyRent\":\"0\"")).andExpect(status().isBadRequest());assertEquals(AuthAccount.Role.CUSTOMER,owner.getRole());consents.deleteById(owner.getId());consents.flush();list().andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ASSET_CONSENT_REQUIRED"));assertFalse(imports.existsByIssuerAndExternalAssetId(issuer,assetId));}
    @Test void providerFailureAndChangedBindingNeverImport()throws Exception{String v=version();when(assets.assetDetails(issuer,subject)).thenThrow(AccountService.error(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"ASSET_SOURCE_UNAVAILABLE","Unavailable"));submit(body(v)).andExpect(status().isServiceUnavailable());assertFalse(imports.existsByIssuerAndExternalAssetId(issuer,assetId));}
    @Test void rechecksBindingAfterProviderCall()throws Exception{String v=version();when(assets.assetDetails(issuer,subject)).thenAnswer(call->{identities.findById(owner.getId()).orElseThrow().setSubject("auth0|changed");identities.flush();return List.of(source);});submit(body(v)).andExpect(status().isConflict());assertFalse(imports.existsByIssuerAndExternalAssetId(issuer,assetId));}
    @Test void manualPropertyRemainsDraftAndNeedsApproval()throws Exception{
        mvc.perform(post("/api/v1/owner/properties").header("Authorization","Bearer "+token).contentType("application/json").content("{\"imageIds\":[\""+com.ancu.proptech.support.PropertyImageFixtures.stage(imageFiles,owner.getId())+"\"],\"name\":\"Nhập thủ công\",\"address\":\"12 Đường\",\"city\":\"Đà Nẵng\",\"district\":\"Hải Châu\",\"rentalMode\":\"SINGLE_UNIT\",\"apartments\":[{\"roomNumber\":\"MANUAL\",\"title\":\"Nhập thủ công\",\"floor\":0,\"areaM2\":30,\"advertisedMonthlyRent\":3000000}]}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.property.approvalStatus").value("DRAFT")).andExpect(jsonPath("$.apartments[0].publicationStatus").value("DRAFT"));
    }
    @Test void requiresAuthenticatedSession()throws Exception{mvc.perform(get("/api/v1/owner/properties/vneid-assets")).andExpect(status().isUnauthorized());mvc.perform(post("/api/v1/owner/properties/vneid-imports").contentType("application/json").content("{}")).andExpect(status().isUnauthorized());}
}
