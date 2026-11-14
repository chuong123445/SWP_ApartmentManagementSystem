package com.ancu.proptech.controller.property;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AuthService;
import com.ancu.proptech.service.property.ai.*;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.transaction.AfterTransaction;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties="app.assistance-ai.enabled=true") @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class PropertyDocumentGateIntegrationTests {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;@Autowired PropertyRepository properties;@Autowired PropertyEvidenceFileRepository files;@Autowired PropertyEvidenceContentRepository contents;@Autowired PropertyListingDraftRepository drafts;@Autowired PropertyDocumentCheckRepository checks;@Autowired AuthService auth;@Autowired PasswordEncoder encoder;@Autowired JdbcTemplate jdbc;
 @MockitoBean DossierAiClient client;
 private AuthAccount owner;private Property property;private PropertyEvidenceFile file;private String token;private static String password;
 @BeforeEach void setup(){
  if(password==null)password=encoder.encode("Document-gate!1234");
  owner=new AuthAccount();owner.setEmail(UUID.randomUUID()+"@example.invalid");owner.setFullName("Gate test");owner.setRole(AuthAccount.Role.OWNER);owner.setStatus(AuthAccount.Status.ACTIVE);owner.setEmailVerified(true);owner.setPasswordHash(password);accounts.saveAndFlush(owner);com.ancu.proptech.support.VerifiedIdentityFixtures.bind(identities,owner);token=auth.login(owner.getEmail(),"Document-gate!1234").tokens().accessToken();
  property=new Property();property.setOwner(owner);property.setName("Gate property");property.setAddress("Address");property.setCity("City");property.setDistrict("District");property.setRentalMode(Property.RentalMode.SINGLE_UNIT);property.setApprovalStatus(Property.ApprovalStatus.DRAFT);property.setRightType(PropertyDossier.RightType.OWNERSHIP);property.setOnboardingApplication(true);properties.saveAndFlush(property);
  var draft=new PropertyListingDraft();draft.setPropertyId(property.getId());draft.setAccountId(owner.getId());draft.setRequestKey(UUID.randomUUID().toString());draft.setPayload("{}");draft.setUpdatedAt(java.time.Instant.now());drafts.saveAndFlush(draft);file=addFile(PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT);
 }
 private PropertyEvidenceFile addFile(PropertyEvidenceFile.Purpose purpose){var f=new PropertyEvidenceFile();f.setProperty(property);f.setUploader(owner);f.setPurpose(purpose);f.setFilename("scan.png");f.setContentType("image/png");f.setSizeBytes(3);f.setCreatedAt(java.time.Instant.now());files.saveAndFlush(f);var bytes=new PropertyEvidenceContent();bytes.setId(f.getId());bytes.setContent(new byte[]{1,2,3});contents.saveAndFlush(bytes);return f;}
 private Map<String,Object> dossier(){return Map.of("propertyVersion",property.getVersion(),"rightType","OWNERSHIP","documentFileIds",List.of(file.getId()));}
 private String base()throws Exception{return json.readTree(mvc.perform(post("/api/v1/me/rental-properties/"+property.getId()+"/ai-precheck").header("Authorization","Bearer "+token).contentType("application/json").content(json.writeValueAsString(Map.of("draft",dossier())))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("sourceHash").asString();}
 private ResultActions scan()throws Exception{return mvc.perform(post("/api/v1/me/rental-properties/"+property.getId()+"/ai-extract").header("Authorization","Bearer "+token).contentType("application/json").content(json.writeValueAsString(Map.of("draft",dossier(),"fileId",file.getId(),"sourceHash",base(),"consent",true))));}
 private ResultActions advance()throws Exception{var d=drafts.findById(property.getId()).orElseThrow();return mvc.perform(put("/api/v1/me/listing-drafts/"+property.getId()).header("Authorization","Bearer "+token).contentType("application/json").content(json.writeValueAsString(Map.of("version",d.getVersion(),"payload",Map.of("step",1,"extractionVersion",3,"extractedFileIds",List.of(file.getId().toString()))))));}
 private DossierAiReport.FileReview report(boolean readable,String type,Boolean match){return new DossierAiReport.FileReview(file.getId().toString(),readable,type,List.of(new DossierAiReport.Extraction("certificateNumber","TEST")),List.of(),match);}
 @AfterTransaction void clearAudit(){if(property!=null)jdbc.update("DELETE FROM ai_assistance_runs WHERE property_id=? AND account_id=?",property.getId(),owner.getId());}
 @Test void unrelatedDocumentsBlockExtractionAndForgedFrontendFlagsCannotAdvance()throws Exception{
  when(client.extract(any(),any())).thenReturn(report(true,"UNRELATED",false));scan().andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("DOCUMENT_INAPPROPRIATE"));assertFalse(checks.findById(file.getId()).orElseThrow().isAccepted());advance().andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("DOCUMENT_SCAN_REQUIRED"));assertEquals("{}",drafts.findById(property.getId()).orElseThrow().getPayload());
 }
 @Test void missingClassificationUnreadableAndContradictoryTypeAreFailClosed()throws Exception{
  for(var r:List.of(report(true,"RIGHT_DOCUMENT",null),report(false,"RIGHT_DOCUMENT",true),report(true,"ORIGINAL_LEASE",true))){when(client.extract(any(),any())).thenReturn(r);scan().andExpect(status().isUnprocessableEntity());advance().andExpect(status().isUnprocessableEntity());}
 }
 @Test void properDocumentCanAdvanceButNewUnscannedAttachmentBlocksAgain()throws Exception{
  when(client.extract(any(),any())).thenReturn(report(true,"RIGHT_DOCUMENT",true));scan().andExpect(status().isOk()).andExpect(jsonPath("$.review.purposeMatch").value(true));advance().andExpect(status().isOk()).andExpect(jsonPath("$.acceptedFileIds[0]").value(file.getId().toString()));
  addFile(PropertyEvidenceFile.Purpose.SUPPORTING);advance().andExpect(status().isUnprocessableEntity());
 }
 @Test void rescanFailureInvalidatesPriorPassAndLocalChecklistNeverQualifies()throws Exception{
  base();assertFalse(checks.existsById(file.getId()));when(client.extract(any(),any())).thenReturn(report(true,"RIGHT_DOCUMENT",true));scan().andExpect(status().isOk());
  when(client.extract(any(),any())).thenThrow(new DossierAiClient.Failure("PROVIDER_TIMEOUT",true));scan().andExpect(status().isServiceUnavailable());assertFalse(checks.findById(file.getId()).orElseThrow().isAccepted());advance().andExpect(status().isUnprocessableEntity());
 }
 @Test void mismatchedSourceNeverInvokesProviderOrCreatesPass()throws Exception{
  mvc.perform(post("/api/v1/me/rental-properties/"+property.getId()+"/ai-extract").header("Authorization","Bearer "+token).contentType("application/json").content(json.writeValueAsString(Map.of("draft",dossier(),"fileId",file.getId(),"sourceHash","x".repeat(64),"consent",true)))).andExpect(status().isConflict());verifyNoInteractions(client);assertFalse(checks.existsById(file.getId()));
 }
 @Autowired com.ancu.proptech.service.property.PropertyDocumentGate gate;
 @Autowired org.springframework.security.oauth2.jwt.JwtDecoder decoder;
 @Test void oldProviderResponseCannotOverwriteNewerScan()throws Exception{
  when(client.extract(any(),any())).thenAnswer(invocation->{gate.begin(decoder.decode(token),property.getId(),property.getVersion(),file.getId());return report(true,"RIGHT_DOCUMENT",true);});
  scan().andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_SCAN"));assertFalse(checks.findById(file.getId()).orElseThrow().isAccepted());advance().andExpect(status().isUnprocessableEntity());
 }
}
