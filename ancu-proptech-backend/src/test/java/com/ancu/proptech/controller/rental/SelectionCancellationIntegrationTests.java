package com.ancu.proptech.controller.rental;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.service.auth.AuthService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.test.web.servlet.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.util.concurrent.*;
import java.time.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class SelectionCancellationIntegrationTests {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired AuthAccountRepository accounts;@Autowired PropertyRepository properties;@Autowired ApartmentRepository apartments;@Autowired RentalRequestRepository requests;@Autowired RentalContractRepository contracts;@Autowired ContractDraftRepository drafts;@Autowired AuthService auth;@Autowired PasswordEncoder passwords;@Autowired JdbcTemplate jdbc;
 private AuthAccount owner,customer,other;private Property property;private Apartment apartment;private RentalRequest request;private String ownerToken,customerToken,otherToken;private static String hash;
 @BeforeEach void setup(){if(hash==null)hash=passwords.encode("Cancel-test!12345");owner=account(AuthAccount.Role.OWNER);customer=account(AuthAccount.Role.CUSTOMER);other=account(AuthAccount.Role.OWNER);ownerToken=token(owner);customerToken=token(customer);otherToken=token(other);
  property=new Property();property.setOwner(owner);property.setName("Cancellation test");property.setAddress("Test");property.setCity("Test");property.setDistrict("Test");property.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(property);
  apartment=new Apartment();apartment.setProperty(property);apartment.setTitle("Cancel room");apartment.setRoomNumber("C101");apartment.setDescription("Test");apartment.setAreaM2(new BigDecimal("30"));apartment.setAdvertisedMonthlyRent(new BigDecimal("5000000"));apartment.setAvailability(Apartment.Availability.CONTRACT_IN_PROGRESS);apartment.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);apartment.setCreatedAt(Instant.now());apartments.saveAndFlush(apartment);
  request=selection(RentalRequest.Status.ACCEPTED);
 }
 private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail(UUID.randomUUID()+"@example.invalid");a.setFullName("Cancel fixture "+role);a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setPasswordHash(hash);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);}
 private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Cancel-test!12345").tokens().accessToken();}
 private RentalRequest selection(RentalRequest.Status state){var r=new RentalRequest();r.setApartment(apartment);r.setCustomer(customer);r.setStatus(state);r.setMessage("fixture");r.setCreatedAt(Instant.now());r.setDecisionReason("Original acceptance note");r.setDecidedAt(Instant.now());return requests.saveAndFlush(r);}
 private String path(){return "/api/v1/rental-requests/"+request.getId()+"/cancellation";}
 private String version(String actor)throws Exception{return json.readTree(mvc.perform(get(path()).header("Authorization",actor)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("sourceVersion").asString();}
 private ResultActions act(String actor,String action,String version,String reason)throws Exception{return mvc.perform(post(path()+"/actions").header("Authorization",actor).contentType("application/json").content(json.writeValueAsString(Map.of("action",action,"sourceVersion",version,"reason",reason))));}
 private String draft()throws Exception{String ctx=mvc.perform(get("/api/v1/owner/rental-requests/"+request.getId()+"/contract-context").header("Authorization",ownerToken)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();var body=new LinkedHashMap<String,Object>();body.put("requestVersion",request.getVersion());body.put("sourceVersion",json.readTree(ctx).path("sourceVersion").asString());body.put("startDate",LocalDate.now().plusDays(1).toString());body.put("endDate",LocalDate.now().plusYears(1).toString());body.put("monthlyRent","5000000");body.put("electricityUnitPrice","3500");body.put("waterUnitPrice","15000");body.put("deposit","10000000");body.put("paymentDay",5);body.put("paymentMethod","Transfer");body.put("usagePurpose","Living");body.put("clauses",List.of(Map.of("title","Term","body","Fixture")));return mvc.perform(post("/api/v1/owner/rental-requests/"+request.getId()+"/contract").header("Authorization",ownerToken).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();}
 private String signature()throws Exception{var image=new java.awt.image.BufferedImage(900,280,java.awt.image.BufferedImage.TYPE_INT_ARGB);var pen=image.createGraphics();pen.setColor(java.awt.Color.BLACK);pen.setStroke(new java.awt.BasicStroke(4));pen.drawPolyline(new int[]{70,160,240,170,400,490,570,700},new int[]{180,70,170,210,80,180,100,170},8);pen.dispose();var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",bytes);return "data:image/png;base64,"+Base64.getEncoder().encodeToString(bytes.toByteArray());}
 private ResultActions sign(String d,String actor)throws Exception{var value=json.readTree(d);return mvc.perform(post("/api/v1/contracts/"+value.path("id").asString()+"/signatures").header("Authorization",actor).contentType("application/json").content(json.writeValueAsString(Map.of("version",value.path("version").asLong(),"contentHash",value.path("signing").path("contentHash").asString(),"signature",signature(),"consent",true))));}
 @Test void directCancellationRetainsHistoryReopensRoomAndKeepsOtherRequestsAndPublication()throws Exception{
  var waiting=selection(RentalRequest.Status.PENDING);String source=version(customerToken);
  act(customerToken,"START",source,"No longer renting").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("CANCELLED")).andExpect(jsonPath("$.history.length()").value(1)).andExpect(jsonPath("$.history[0].before.decisionReason").value("Original acceptance note"));
  act(customerToken,"START",source,"No longer renting").andExpect(status().isOk()).andExpect(jsonPath("$.history.length()").value(1));
  assertEquals(Apartment.Availability.VACANT,apartment.getAvailability());assertEquals(Apartment.PublicationStatus.PUBLISHED,apartment.getPublicationStatus());assertEquals(RentalRequest.Status.PENDING,waiting.getStatus());
  mvc.perform(get("/api/v1/me/notifications").header("Authorization",ownerToken)).andExpect(status().isOk());
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM selection_cancellation_events WHERE request_id=?",Integer.class,request.getId()));
 }
 @Test void unsignedDraftIsCancelledAndNewSelectionCanCreateItsOwnDraft()throws Exception{
  String d=draft();String id=json.readTree(d).path("id").asString();String source=version(ownerToken);act(ownerToken,"START",source,"Change of plan").andExpect(status().isOk()).andExpect(jsonPath("$.contractStatus").value("CANCELLED"));
  mvc.perform(get("/api/v1/contracts/"+id).header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));mvc.perform(get("/api/v1/contracts/"+id+"/pdf").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(content().contentType("application/pdf"));sign(d,customerToken).andExpect(status().isConflict());
  String submitted=mvc.perform(post("/api/v1/apartments/"+apartment.getId()+"/rental-requests").header("Authorization",customerToken).contentType("application/json").content("{\"message\":\"New selection\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
  request=requests.findById(Long.valueOf(json.readTree(submitted).path("id").asString())).orElseThrow();mvc.perform(post("/api/v1/owner/rental-requests/"+request.getId()+"/decisions").header("Authorization",ownerToken).contentType("application/json").content("{\"version\":0,\"decision\":\"ACCEPT\"}")).andExpect(status().isOk());draft();
 }
 @Test void oneSignatureNeedsOtherPartyConsentAndBlocksSigningUntilRejectedOrWithdrawn()throws Exception{
  String d=draft();sign(d,ownerToken).andExpect(status().isOk());String source=version(customerToken);act(customerToken,"START",source,"Cannot move in").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("PENDING"));
  sign(d,customerToken).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CANCELLATION_PENDING"));
  act(customerToken,"ACCEPT",version(customerToken),"").andExpect(status().isForbidden());
  act(ownerToken,"REJECT",version(ownerToken),"Please discuss").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("REJECTED"));
  act(customerToken,"START",version(customerToken),"New request").andExpect(status().isOk());act(customerToken,"WITHDRAW",version(customerToken),"").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("WITHDRAWN"));
  sign(d,customerToken).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));assertEquals(Apartment.Availability.OCCUPIED,apartment.getAvailability());
 }
 @Test void bilateralCancellationPreservesSignedContentAndDoesNotCreateRefundOrEndedState()throws Exception{
  String d=draft();sign(d,ownerToken).andExpect(status().isOk());var contractId=Long.valueOf(json.readTree(d).path("id").asString());var saved=drafts.findByContractId(contractId).orElseThrow();byte[] original=saved.getOwnerSignature().clone();String content=saved.getSignedContentHash();String snapshot=saved.getSnapshotJson();
  act(ownerToken,"START",version(ownerToken),"Cancel by agreement").andExpect(status().isOk());String source=version(customerToken);act(customerToken,"ACCEPT",source,"").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("CANCELLED"));act(customerToken,"ACCEPT",source,"").andExpect(status().isOk()).andExpect(jsonPath("$.history.length()").value(2));
  assertArrayEquals(original,saved.getOwnerSignature());assertEquals(content,saved.getSignedContentHash());assertEquals(snapshot,saved.getSnapshotJson());assertNull(saved.getContract().getEndedAt());assertEquals(RentalContract.Status.CANCELLED,saved.getContract().getStatus());assertEquals(Apartment.Availability.VACANT,apartment.getAvailability());
 }
 @Test void staleForeignActiveRenewalAndOtherClaimsCannotBeCancelled()throws Exception{
  mvc.perform(get(path()).header("Authorization",otherToken)).andExpect(status().isNotFound());act(otherToken,"START","a".repeat(64),"Try").andExpect(status().isNotFound());
  String source=version(ownerToken);act(ownerToken,"START",source,"").andExpect(status().isBadRequest());String d=draft();act(ownerToken,"START",source,"Old view").andExpect(status().isConflict());
  var c=contracts.findById(Long.valueOf(json.readTree(d).path("id").asString())).orElseThrow();c.setRenewalOfContractId(999L);contracts.saveAndFlush(c);act(ownerToken,"START",version(ownerToken),"Renewal").andExpect(status().isConflict());c.setRenewalOfContractId(null);c.setStatus(RentalContract.Status.ACTIVE);contracts.saveAndFlush(c);act(ownerToken,"START",version(ownerToken),"Active").andExpect(status().isConflict());c.setStatus(RentalContract.Status.DRAFT);contracts.saveAndFlush(c);
  selection(RentalRequest.Status.ACCEPTED);act(ownerToken,"START",version(ownerToken),"Unsafe room").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("APARTMENT_HAS_OTHER_CLAIM"));assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,apartment.getAvailability());
 }
 @Test void signatureChangesInvalidateCancellationSourceEvenWhenContentVersionDidNotChange()throws Exception{
  String d=draft();String before=version(customerToken);sign(d,ownerToken).andExpect(status().isOk());act(customerToken,"START",before,"Stale signature state").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));
 }
 @Test void simultaneousCancellationAndSecondSignatureNeverReopenAnActiveContract()throws Exception{
  String d=draft();sign(d,ownerToken).andExpect(status().isOk());String source=version(ownerToken);TestTransaction.flagForCommit();TestTransaction.end();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
  try{var a=pool.submit(()->{gate.await();return act(ownerToken,"START",source,"Concurrent proposal").andReturn().getResponse().getStatus();});var b=pool.submit(()->{gate.await();return sign(d,customerToken).andReturn().getResponse().getStatus();});gate.countDown();var statuses=new ArrayList<>(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS)));Collections.sort(statuses);assertEquals(List.of(200,409),statuses);String state=jdbc.queryForObject("SELECT status FROM rental_contracts WHERE id=?",String.class,Long.valueOf(json.readTree(d).path("id").asString()));String room=jdbc.queryForObject("SELECT availability FROM rental_apartments WHERE id=?",String.class,apartment.getId());assertEquals(state.equals("ACTIVE")?"OCCUPIED":"CONTRACT_IN_PROGRESS",room);
  }finally{pool.shutdownNow();cleanup();}
 }
 @Test void notificationsGoToCounterpartyAndDoNotDuplicateTheLegacyCustomerCancelledFeed()throws Exception{
  act(ownerToken,"START",version(ownerToken),"Owner cancellation").andExpect(status().isOk());
  for(var party:List.of(ownerToken,customerToken)){
   var feed=json.readTree(mvc.perform(get("/api/v1/me/notifications").header("Authorization",party)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());int count=0,legacy=0;for(var item:feed.path("items")){String id=item.path("id").asString();if(id.startsWith("selection-cancel:"))count++;if(id.equals("request-cancelled:"+request.getId()))legacy++;}assertEquals(party.equals(customerToken)?1:0,count);assertEquals(0,legacy);
  }
 }
 @Test void concurrentOtherAcceptanceCannotLeaveVacantRoomWithALiveSelection()throws Exception{
  var next=selection(RentalRequest.Status.PENDING);next.setCustomer(other);requests.saveAndFlush(next);String source=version(ownerToken);TestTransaction.flagForCommit();TestTransaction.end();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
  try{var a=pool.submit(()->{gate.await();return act(ownerToken,"START",source,"Cancel old selection").andReturn().getResponse().getStatus();});var b=pool.submit(()->{gate.await();return mvc.perform(post("/api/v1/owner/rental-requests/"+next.getId()+"/decisions").header("Authorization",ownerToken).contentType("application/json").content("{\"version\":0,\"decision\":\"ACCEPT\"}")).andReturn().getResponse().getStatus();});gate.countDown();int cancelled=a.get(30,TimeUnit.SECONDS),accepted=b.get(30,TimeUnit.SECONDS);assertEquals(200,cancelled);assertTrue(accepted==200||accepted==409,"Unexpected accept status "+accepted);assertEquals(accepted==200?"CONTRACT_IN_PROGRESS":"VACANT",jdbc.queryForObject("SELECT availability FROM rental_apartments WHERE id=?",String.class,apartment.getId()));}
  finally{pool.shutdownNow();cleanup();}
 }
 @Test void sourceTokensAreBoundToRequestAndApartmentEvenWhenAllVersionsAndTimesMatch()throws Exception{
  String first=version(ownerToken);var original=request;var otherRoom=new Apartment();otherRoom.setProperty(property);otherRoom.setTitle(apartment.getTitle());otherRoom.setRoomNumber("C102");otherRoom.setDescription("Test");otherRoom.setAreaM2(apartment.getAreaM2());otherRoom.setAdvertisedMonthlyRent(apartment.getAdvertisedMonthlyRent());otherRoom.setAvailability(Apartment.Availability.CONTRACT_IN_PROGRESS);otherRoom.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);otherRoom.setCreatedAt(apartment.getCreatedAt());apartments.saveAndFlush(otherRoom);
  var second=new RentalRequest();second.setApartment(otherRoom);second.setCustomer(customer);second.setStatus(original.getStatus());second.setMessage(original.getMessage());second.setCreatedAt(original.getCreatedAt());second.setDecidedAt(original.getDecidedAt());second.setDecisionReason(original.getDecisionReason());requests.saveAndFlush(second);request=second;
  assertNotEquals(first,version(ownerToken));act(ownerToken,"START",first,"Wrong source scope").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));request=original;
 }
 private void cleanup(){Long aid=apartment.getId();jdbc.update("DELETE FROM selection_cancellation_events WHERE request_id IN(SELECT id FROM rental_requests WHERE apartment_id=?)",aid);jdbc.update("DELETE FROM selection_cancellations WHERE request_id IN(SELECT id FROM rental_requests WHERE apartment_id=?)",aid);jdbc.update("DELETE FROM contract_drafts WHERE contract_id IN(SELECT id FROM rental_contracts WHERE apartment_id=?)",aid);jdbc.update("DELETE FROM rental_contracts WHERE apartment_id=?",aid);jdbc.update("DELETE FROM rental_requests WHERE apartment_id=?",aid);jdbc.update("DELETE FROM rental_apartment_amenities WHERE apartment_id=?",aid);jdbc.update("DELETE FROM rental_apartments WHERE id=?",aid);jdbc.update("DELETE FROM rental_properties WHERE id=?",property.getId());for(var a:List.of(owner,customer,other)){jdbc.update("DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id=?)",a.getId());jdbc.update("DELETE FROM auth_sessions WHERE account_id=?",a.getId());jdbc.update("DELETE FROM auth_account_roles WHERE account_id=?",a.getId());jdbc.update("DELETE FROM auth_accounts WHERE id=?",a.getId());}}
}
