package com.ancu.proptech.controller.property;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AuthService;
import com.ancu.proptech.service.property.PropertyRightsPolicy;
import com.ancu.proptech.support.VerifiedIdentityFixtures;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.io.ByteArrayOutputStream;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.seed.enabled=false","app.billing.local-fixtures=false"}) @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class PropertyRightsOnboardingIntegrationTests {
    @Autowired com.ancu.proptech.repository.property.PropertyImageRepository imageFiles;
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;
    @Autowired PropertyRepository properties;@Autowired PropertyDossierRepository dossiers;@Autowired AuthService auth;@Autowired ObjectMapper json;@Autowired PropertyRightsPolicy rights;
    AuthAccount applicant,admin,other;String token,adminToken;Long propertyId;LocalDate from,until;
    @BeforeEach void setup(){applicant=account(AuthAccount.Role.CUSTOMER);admin=account(AuthAccount.Role.ADMIN);other=account(AuthAccount.Role.CUSTOMER);VerifiedIdentityFixtures.bind(identities,applicant);VerifiedIdentityFixtures.bind(identities,other);token=session(applicant);adminToken=session(admin);from=rights.today();until=from.plusYears(1);}
    AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail("rights-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Người nộp hồ sơ");a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);return accounts.saveAndFlush(a);}
    String session(AuthAccount a){return "Bearer "+auth.createSession(a).tokens().accessToken();}
    String createBody(String type){return """
        {"imageIds":["%s"],"rightType":"%s","name":"Hồ sơ tài sản","address":"12 Đường kiểm thử","city":"Đà Nẵng","district":"Hải Châu","rentalMode":"SINGLE_UNIT","apartments":[{"roomNumber":"A.01","title":"Căn hộ hồ sơ","floor":1,"areaM2":"40","advertisedMonthlyRent":"4500000"}]}
        """.formatted(com.ancu.proptech.support.PropertyImageFixtures.stage(imageFiles,applicant.getId()),type);}
    void create(String type)throws Exception{var r=mvc.perform(post("/api/v1/me/rental-properties").header("Authorization",token).contentType("application/json").content(createBody(type))).andExpect(status().isCreated()).andExpect(jsonPath("$.property.approvalStatus").value("DRAFT")).andReturn();propertyId=Long.valueOf(json.readTree(r.getResponse().getContentAsString()).get("property").get("id").asText());}
    byte[] pdf(boolean active)throws Exception{try(var document=new PDDocument();var out=new ByteArrayOutputStream()){document.addPage(new PDPage());if(active)document.getDocumentCatalog().setOpenAction(new PDActionJavaScript("app.alert('fixture');"));document.save(out);return out.toByteArray();}}
    ResultActions upload(String auth,String purpose,byte[] bytes)throws Exception{return mvc.perform(multipart("/api/v1/me/rental-properties/"+propertyId+"/evidence-files").file(new MockMultipartFile("file","../giay-to.pdf","application/pdf",bytes)).param("purpose",purpose).header("Authorization",auth));}
    String file(String purpose)throws Exception{return json.readTree(upload(token,purpose,pdf(false)).andExpect(status().isCreated()).andExpect(jsonPath("$.contentType").value("application/pdf")).andReturn().getResponse().getContentAsString()).get("id").asText();}
    Map<String,Object> dossier(String type)throws Exception{
        var b=new LinkedHashMap<String,Object>();b.put("propertyVersion",properties.findById(propertyId).orElseThrow().getVersion());b.put("rightType",type);b.put("receivingAccount",Map.of("bank","Ngân hàng kiểm thử","accountNumber","1234567890","accountHolderName","Căn cước đã xác thực"));b.put("documentFileIds",List.of(file("RIGHT_DOCUMENT")));b.put("rightsValidFrom",from.toString());b.put("rightsValidUntil",until.toString());b.put("principalName","Chủ sở hữu gốc");b.put("principalDocumentNumber","048090000099");
        if(type.equals("AUTHORIZATION"))b.put("authorizationFileIds",List.of(file("AUTHORIZATION_DOCUMENT")));
        if(type.equals("SUBLEASE")){b.put("originalLeaseFrom",from.minusMonths(1).toString());b.put("originalLeaseUntil",until.toString());b.put("originalLeaseFileIds",List.of(file("ORIGINAL_LEASE")));b.put("subleaseConsentFileIds",List.of(file("SUBLEASE_CONSENT")));}return b;
    }
    ResultActions submit(Map<String,Object> b)throws Exception{return mvc.perform(post("/api/v1/me/rental-properties/"+propertyId+"/verification-dossiers").header("Authorization",token).contentType("application/json").content(json.writeValueAsString(b)));}
    Long send(String type)throws Exception{return Long.valueOf(json.readTree(submit(dossier(type)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText());}
    ResultActions decide(Long id,String decision,boolean confirm)throws Exception{return mvc.perform(post("/api/v1/admin/property-dossiers/"+id+"/decisions").header("Authorization",adminToken).contentType("application/json").content(json.writeValueAsString(Map.of("decision",decision,"rightsConfirmed",confirm,"version",dossiers.findById(id).orElseThrow().getVersion(),"reason","Đã đối chiếu giấy tờ"))));}
    @Test void verifiedCustomerSubmitsAndAdminApprovesExactPropertyAndPromotesWithoutAutoPublishing()throws Exception{
        create("AUTHORIZATION");assertEquals(AuthAccount.Role.CUSTOMER,applicant.getRole());Long dossier=send("AUTHORIZATION");
        decide(dossier,"APPROVE",false).andExpect(status().isBadRequest());assertEquals(AuthAccount.Role.CUSTOMER,applicant.getRole());
        decide(dossier,"APPROVE",true).andExpect(status().isOk());assertEquals(AuthAccount.Role.OWNER,applicant.getRole());
        var p=properties.findById(propertyId).orElseThrow();assertEquals(until,p.getRightsValidUntil());assertEquals(Property.ApprovalStatus.APPROVED,p.getApprovalStatus());assertEquals(dossier,p.getApprovedRightsDossierId());
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$[0].publicationStatus").value("DRAFT"));
    }
    @Test void emailOnlyCannotApplyOrUpload()throws Exception{identities.deleteById(applicant.getId());identities.flush();applicant.setEmailVerified(true);accounts.flush();mvc.perform(post("/api/v1/me/rental-properties").header("Authorization",token).contentType("application/json").content(createBody("AUTHORIZATION"))).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("VNEID_REQUIRED"));}
    @Test void customerDoesNotGainOwnerApiAccessWhilePending()throws Exception{create("SUBLEASE");send("SUBLEASE");mvc.perform(get("/api/v1/owner/properties").header("Authorization",token)).andExpect(status().isForbidden());mvc.perform(get("/api/v1/me/rental-properties").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));}
    @Test void rejectsForgedRoleAndOwnershipShortcut()throws Exception{mvc.perform(post("/api/v1/me/rental-properties").header("Authorization",token).contentType("application/json").content(createBody("OWNERSHIP"))).andExpect(status().isBadRequest());mvc.perform(post("/api/v1/me/rental-properties").header("Authorization",token).contentType("application/json").content(createBody("SUBLEASE").replace("\"rightType\"","\"role\":\"OWNER\",\"rightType\""))).andExpect(status().isBadRequest());}
    @Test void privatePdfAccessAndWrongApplicantCannotReadOrChange()throws Exception{create("AUTHORIZATION");String file=file("RIGHT_DOCUMENT");mvc.perform(get("/api/v1/property-evidence-files/"+file).header("Authorization",token)).andExpect(status().isOk()).andExpect(content().contentType("application/pdf")).andExpect(header().string("Cache-Control","no-store")).andExpect(header().string("X-Content-Type-Options","nosniff"));mvc.perform(get("/api/v1/property-evidence-files/"+file).header("Authorization",session(other))).andExpect(status().isNotFound());mvc.perform(get("/api/v1/property-evidence-files/"+file).header("Authorization",adminToken)).andExpect(status().isNotFound());upload(session(other),"RIGHT_DOCUMENT",pdf(false)).andExpect(status().isNotFound());}
    @Test void rejectsMalformedActiveAndOversizedPdf()throws Exception{create("AUTHORIZATION");upload(token,"RIGHT_DOCUMENT","%PDF-broken".getBytes()).andExpect(status().isBadRequest());upload(token,"RIGHT_DOCUMENT",pdf(true)).andExpect(status().isBadRequest());upload(token,"RIGHT_DOCUMENT",new byte[10*1024*1024+1]).andExpect(status().isBadRequest());}
    @Test void encryptedPdfAndTooManyPagesAreRejected()throws Exception{
        create("AUTHORIZATION");try(var document=new PDDocument();var out=new ByteArrayOutputStream()){
            document.addPage(new PDPage());document.protect(new org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy("owner-fixture","reader-fixture",new org.apache.pdfbox.pdmodel.encryption.AccessPermission()));document.save(out);upload(token,"RIGHT_DOCUMENT",out.toByteArray()).andExpect(status().isBadRequest());}
        try(var document=new PDDocument();var out=new ByteArrayOutputStream()){for(int i=0;i<101;i++)document.addPage(new PDPage());document.save(out);upload(token,"RIGHT_DOCUMENT",out.toByteArray()).andExpect(status().isBadRequest());}
    }
    @Test void subleaseNeedsSeparateConsentAndOriginalLease()throws Exception{create("SUBLEASE");var body=dossier("SUBLEASE");body.remove("subleaseConsentFileIds");submit(body).andExpect(status().isBadRequest());assertEquals(AuthAccount.Role.CUSTOMER,applicant.getRole());}
    @Test void authorityTypeAndPurposeMustMatch()throws Exception{create("AUTHORIZATION");var body=dossier("AUTHORIZATION");body.put("authorizationFileIds",body.get("documentFileIds"));submit(body).andExpect(status().isBadRequest());}
    @Test void doesNotInferOneYearForMissingValidity()throws Exception{create("AUTHORIZATION");var body=dossier("AUTHORIZATION");body.remove("rightsValidUntil");submit(body).andExpect(status().isBadRequest());}
    @Test void consentCannotOutlastOrStartBeforeOriginalLease()throws Exception{create("SUBLEASE");var body=dossier("SUBLEASE");body.put("rightsValidUntil",until.plusDays(1).toString());submit(body).andExpect(status().isBadRequest());body.put("rightsValidUntil",until.toString());body.put("rightsValidFrom",from.minusYears(1).toString());submit(body).andExpect(status().isBadRequest());}
    @Test void adminRejectKeepsCustomerAndOnlyThisPropertyChanges()throws Exception{create("AUTHORIZATION");Long dossier=send("AUTHORIZATION");decide(dossier,"REJECT",false).andExpect(status().isOk());assertEquals(AuthAccount.Role.CUSTOMER,applicant.getRole());assertEquals(Property.ApprovalStatus.REJECTED,properties.findById(propertyId).orElseThrow().getApprovalStatus());}
    @Test void expiredRightCannotPublishOrExceedContractWindow(){var p=new Property();p.setRightType(PropertyDossier.RightType.AUTHORIZATION);p.setRightsValidFrom(from.minusYears(1));p.setRightsValidUntil(from.minusDays(1));assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->rights.requireCurrent(p));p.setRightsValidUntil(until);assertDoesNotThrow(()->rights.contract(p,from,until));assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->rights.contract(p,from,until.plusDays(1)));}
    @Test void renewalIsAppendOnlyAndPendingDoesNotRevokeOldPermission()throws Exception{
        create("SUBLEASE");Long first=send("SUBLEASE");decide(first,"APPROVE",true).andExpect(status().isOk());var p=properties.findById(propertyId).orElseThrow();
        Long second=send("SUBLEASE");assertTrue(dossiers.findById(second).orElseThrow().isRenewal());assertEquals(Property.ApprovalStatus.APPROVED,p.getApprovalStatus());
        decide(second,"REJECT",false).andExpect(status().isOk());assertEquals(first,p.getApprovedRightsDossierId());assertEquals(Property.ApprovalStatus.APPROVED,p.getApprovalStatus());assertEquals(PropertyDossier.Status.APPROVED,dossiers.findById(first).orElseThrow().getStatus());
    }
    @Test void lockedApplicantCannotBePromotedByApproval()throws Exception{create("AUTHORIZATION");Long dossier=send("AUTHORIZATION");applicant.setStatus(AuthAccount.Status.LOCKED);accounts.flush();decide(dossier,"APPROVE",true).andExpect(status().isConflict());assertEquals(AuthAccount.Role.CUSTOMER,applicant.getRole());}
}
