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
    @Autowired PropertyImageRepository images;
    @Autowired PropertyEvidenceFileRepository evidence;
    @Autowired PropertyEvidenceContentRepository contents;
    @Autowired com.ancu.proptech.repository.apartment.ApartmentRepository apartments;
    @Autowired PropertyDossierRepository dossiers;
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
    @Test void completionCreatesPrivateInventoryAndRetryKeepsOneSubmission()throws Exception{
        String key=UUID.randomUUID().toString();
        var response=mvc.perform(post("/api/v1/me/listing-drafts").header("Authorization","Bearer "+token)
                .contentType("application/json").content(json.writeValueAsString(Map.of("requestKey",key,"rightType","OWNERSHIP")))).andExpect(status().isOk()).andReturn();
        var created=json.readTree(response.getResponse().getContentAsString());
        Long id=Long.valueOf(created.path("propertyId").asString());
        var file=new com.ancu.proptech.model.property.PropertyEvidenceFile();
        file.setProperty(properties.findById(id).orElseThrow());file.setUploader(actor);
        file.setPurpose(com.ancu.proptech.model.property.PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT);
        file.setFilename("fixture.png");file.setContentType("image/png");file.setSizeBytes(3);file.setCreatedAt(java.time.Instant.now());evidence.saveAndFlush(file);
        var content=new com.ancu.proptech.model.property.PropertyEvidenceContent();content.setId(file.getId());content.setContent(new byte[]{1,2,3});contents.saveAndFlush(content);
        Long common=com.ancu.proptech.support.PropertyImageFixtures.stage(images,actor.getId());
        Long room=com.ancu.proptech.support.PropertyImageFixtures.stage(images,actor.getId());
        var unit=new com.ancu.proptech.dto.property.OwnerPropertyCreate.Unit();unit.setRoomNumber("P101");unit.setTitle("Phòng 101");unit.setFloor(1);
        unit.setAreaM2(new java.math.BigDecimal("24"));unit.setAdvertisedMonthlyRent(new java.math.BigDecimal("4000000"));
        unit.setElectricityUnitPrice(new java.math.BigDecimal("3500"));unit.setWaterUnitPrice(new java.math.BigDecimal("15000"));unit.setImageIds(List.of(room));
        var property=new com.ancu.proptech.dto.property.OwnerPropertyCreate();property.setName("Nhà kiểm thử");property.setAddress("12 Đường A");property.setCity("Test City");property.setDistrict("Test District");
        property.setRentalMode(com.ancu.proptech.model.property.Property.RentalMode.SINGLE_UNIT);property.setImageIds(List.of(common));property.setApartments(List.of(unit));
        var dossier=new com.ancu.proptech.dto.property.PropertyDossierSubmit();dossier.setPropertyVersion(0L);dossier.setRightType(com.ancu.proptech.model.property.PropertyDossier.RightType.OWNERSHIP);dossier.setDocumentFileIds(List.of(file.getId()));
        String body=json.writeValueAsString(new com.ancu.proptech.dto.property.PropertyListingDtos.Finish(0L,property,dossier,true));
        String route="/api/v1/me/listing-drafts/"+id+"/complete";
        for(int attempt=0;attempt<2;attempt++)mvc.perform(post(route).header("Authorization","Bearer "+token).contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(true));
        assertEquals(1,apartments.countByPropertyId(id));
        assertEquals(1,dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(id).size());
        var apartment=apartments.findByPropertyIdOrderByIdAsc(id).getFirst();
        assertEquals(com.ancu.proptech.model.apartment.Apartment.PublicationStatus.DRAFT,apartment.getPublicationStatus());
        assertFalse(actor.hasRole(AuthAccount.Role.OWNER));
    }
}
