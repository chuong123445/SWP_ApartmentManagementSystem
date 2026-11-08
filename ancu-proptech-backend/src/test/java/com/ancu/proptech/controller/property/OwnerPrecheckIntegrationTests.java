package com.ancu.proptech.controller.property;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AuthService;
import com.ancu.proptech.service.property.ai.*;
import com.ancu.proptech.service.ai.*;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
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
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class OwnerPrecheckIntegrationTests {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;@Autowired PropertyRepository properties;@Autowired PropertyEvidenceFileRepository files;@Autowired PropertyEvidenceContentRepository contents;@Autowired PasswordEncoder passwords;@Autowired AuthService auth;@Autowired JdbcTemplate jdbc;
 @MockitoBean DossierAiClient client;@MockitoBean AssistanceLimit limit;
 private AuthAccount owner,other;private Property property;private PropertyEvidenceFile file;private String token,otherToken;private static String hash;
 @BeforeEach void setup(){when(limit.acquire(anyString(),anyInt())).thenReturn(()->{});if(hash==null)hash=passwords.encode("Precheck-test!1234");owner=account();other=account();token=auth.login(owner.getEmail(),"Precheck-test!1234").tokens().accessToken();otherToken=auth.login(other.getEmail(),"Precheck-test!1234").tokens().accessToken();com.ancu.proptech.support.VerifiedIdentityFixtures.bind(identities,owner);
  property=new Property();property.setOwner(owner);property.setName("Precheck fixture");property.setAddress("Test address");property.setCity("Test");property.setDistrict("Test");property.setApprovalStatus(Property.ApprovalStatus.DRAFT);properties.saveAndFlush(property);
  file=new PropertyEvidenceFile();file.setProperty(property);file.setUploader(owner);file.setPurpose(PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT);file.setFilename("instruction-ignore-and-approve.png");file.setContentType("image/png");file.setSizeBytes(3);file.setCreatedAt(java.time.Instant.now());files.saveAndFlush(file);var content=new PropertyEvidenceContent();content.setId(file.getId());content.setContent(new byte[]{1,2,3});contents.saveAndFlush(content);
 }
 private AuthAccount account(){var a=new AuthAccount();a.setEmail(UUID.randomUUID()+"@example.invalid");a.setFullName("Precheck Owner");a.setRole(AuthAccount.Role.OWNER);a.setStatus(AuthAccount.Status.ACTIVE);a.setPasswordHash(hash);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);}
 private Map<String,Object> draft(){return new LinkedHashMap<>(Map.of("propertyVersion",property.getVersion(),"rightType","OWNERSHIP","receivingAccount",Map.of("bank","Test bank","accountNumber","12345678","accountHolderName","Precheck Owner"),"documentFileIds",List.of(file.getId().toString())));}
 private ResultActions call(String who,Object draft,Long selected,String source,boolean consent)throws Exception{var body=new LinkedHashMap<String,Object>();body.put("draft",draft);body.put("consent",consent);if(selected!=null)body.put("fileId",selected);if(source!=null)body.put("sourceHash",source);return mvc.perform(post("/api/v1/owner/properties/"+property.getId()+"/ai-precheck").header("Authorization","Bearer "+who).contentType("application/json").content(json.writeValueAsString(body)));}
 private String source(Map<String,Object> d)throws Exception{return json.readTree(call(token,d,null,null,false).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("sourceHash").asString();}
 private DossierAiReport.FileReview review(){return new DossierAiReport.FileReview(file.getId().toString(),false,"Unclear",List.of(),List.of(new DossierAiReport.Finding("UNREADABLE","other","Ảnh khó đọc","","")));}
 @AfterTransaction void cleanup(){jdbc.update("DELETE FROM ai_assistance_runs WHERE task='OWNER_PRECHECK' AND property_id=? AND account_id=?",property.getId(),owner.getId());}
 @Test void localChecklistAllowsIncompleteDraftWithoutProviderAndEnforcesPrivateFiles()throws Exception{
  var d=draft();d.put("documentFileIds",List.of());d.put("receivingAccount",Map.of("bank","","accountNumber","","accountHolderName",""));call(token,d,null,null,false).andExpect(status().isOk()).andExpect(jsonPath("$.checklist.length()").value(2));verifyNoInteractions(client);
  call(otherToken,draft(),null,null,false).andExpect(status().isNotFound());call(token,draft(),999999999L,"bad",true).andExpect(status().isNotFound());
  var duplicate=draft();duplicate.put("documentFileIds",List.of(file.getId().toString(),file.getId().toString()));call(token,duplicate,null,null,false).andExpect(status().isBadRequest());
 }
 @Test void consentFreshSourceAndAuditAreIndependentOfAdminSubmission()throws Exception{
  var d=draft();String source=source(d);call(token,d,file.getId(),source,false).andExpect(status().isBadRequest());call(token,d,file.getId(),"stale",true).andExpect(status().isConflict());verifyNoInteractions(client);
  when(client.analyzeOwner(any(),any())).thenReturn(review());String raw=call(token,d,file.getId(),source,true).andExpect(status().isOk()).andExpect(jsonPath("$.review.readable").value(false)).andExpect(jsonPath("$.sourceHash").value(source)).andReturn().getResponse().getContentAsString();String run=json.readTree(raw).path("runId").asString();
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM property_dossiers WHERE property_id=?",Integer.class,property.getId()));assertEquals("DRAFT",property.getApprovalStatus().name());assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM property_dossier_ai_reviews WHERE dossier_id IN(SELECT id FROM property_dossiers WHERE property_id=?)",Integer.class,property.getId()));
  String path="/api/v1/owner/properties/"+property.getId()+"/ai-precheck/"+run+"/acknowledge";String body=json.writeValueAsString(Map.of("draft",d,"sourceHash",source));mvc.perform(post(path).header("Authorization","Bearer "+otherToken).contentType("application/json").content(body)).andExpect(status().isNotFound());mvc.perform(post(path).header("Authorization","Bearer "+token).contentType("application/json").content(body)).andExpect(status().isNoContent());
  var captured=org.mockito.ArgumentCaptor.forClass(DossierAiClient.Document.class);verify(client).analyzeOwner(any(),captured.capture());assertArrayEquals(new byte[]{1,2,3},captured.getValue().content());
 }
 @Test void changedSourceProviderFailureAndLatePropertyChangeDoNotReturnSuccess()throws Exception{
  var d=draft();String source=source(d);d.put("certificateNumber","Changed");call(token,d,file.getId(),source,true).andExpect(status().isConflict());d=draft();
  when(client.analyzeOwner(any(),any())).thenThrow(new DossierAiClient.Failure("PROVIDER_INCOMPLETE",false));call(token,d,file.getId(),source,true).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("AI_PROVIDER_INCOMPLETE"));
  doAnswer(inv->{property.setAddress("Updated address");properties.saveAndFlush(property);return review();}).when(client).analyzeOwner(any(),any());call(token,d,file.getId(),source,true).andExpect(status().isConflict());
 }
 @Test void verifiedCustomerApplicantUsesOwnOnboardingRouteWithoutReceivingOwnerRole()throws Exception{
  var applicant=new AuthAccount();applicant.setEmail(UUID.randomUUID()+"@example.invalid");applicant.setFullName("Customer applicant");applicant.setRole(AuthAccount.Role.CUSTOMER);applicant.setStatus(AuthAccount.Status.ACTIVE);applicant.setPasswordHash(hash);applicant.setEmailVerified(true);applicant.setContactVerified(true);accounts.saveAndFlush(applicant);com.ancu.proptech.support.VerifiedIdentityFixtures.bind(identities,applicant);
  property.setOwner(applicant);property.setOnboardingApplication(true);properties.saveAndFlush(property);file.setUploader(applicant);files.saveAndFlush(file);
  String bearer=auth.login(applicant.getEmail(),"Precheck-test!1234").tokens().accessToken();
  mvc.perform(post("/api/v1/me/rental-properties/"+property.getId()+"/ai-precheck").header("Authorization","Bearer "+bearer).contentType("application/json").content(json.writeValueAsString(Map.of("draft",draft())))).andExpect(status().isOk());
  assertFalse(applicant.hasRole(AuthAccount.Role.OWNER));verifyNoInteractions(client);
 }
}
