package com.ancu.proptech.controller.contract;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
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
import org.springframework.mock.web.MockMultipartFile;
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
class ContractExitIntegrationTests {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired AuthAccountRepository accounts;@Autowired PropertyRepository properties;@Autowired ApartmentRepository apartments;@Autowired RentalRequestRepository requests;@Autowired RentalContractRepository contracts;@Autowired ContractDraftRepository drafts;@Autowired RentalInvoiceRepository invoices;@Autowired ContractExitCaseRepository cases;@Autowired ContractRenewalRequestRepository renewals;@Autowired ContractExitEventRepository events;@Autowired AuthService auth;@Autowired PasswordEncoder passwords;@Autowired JdbcTemplate jdbc;
 private AuthAccount owner,customer,other;private Apartment apartment;private RentalRequest request;private RentalContract contract;private ContractDraft draft;private String ot,ct,xt;private static String hash;private LocalDate today;
 @BeforeEach void setup(){today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));if(hash==null)hash=passwords.encode("Exit-test!12345");owner=account(AuthAccount.Role.OWNER);customer=account(AuthAccount.Role.CUSTOMER);other=account(AuthAccount.Role.ADMIN);ot=token(owner);ct=token(customer);xt=token(other);
  var p=new Property();p.setOwner(owner);p.setName("Exit test");p.setAddress("Test");p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(p);
  apartment=new Apartment();apartment.setProperty(p);apartment.setTitle("Exit room");apartment.setRoomNumber("X101");apartment.setDescription("Test");apartment.setAreaM2(new BigDecimal("30"));apartment.setAdvertisedMonthlyRent(new BigDecimal("5000000"));apartment.setAvailability(Apartment.Availability.OCCUPIED);apartment.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);apartment.setCreatedAt(Instant.now());apartments.saveAndFlush(apartment);
  request=new RentalRequest();request.setApartment(apartment);request.setCustomer(customer);request.setStatus(RentalRequest.Status.ACCEPTED);request.setMessage("fixture");request.setCreatedAt(Instant.now());requests.saveAndFlush(request);
  contract=new RentalContract();contract.setApartment(apartment);contract.setCustomer(customer);contract.setStatus(RentalContract.Status.ACTIVE);contract.setStartDate(today.minusMonths(3));contract.setEndDate(today.plusMonths(6));contract.setMonthlyRent(new BigDecimal("5000000"));contract.setElectricityUnitPrice(new BigDecimal("3500"));contract.setWaterUnitPrice(new BigDecimal("15000"));contract.setElectricityBaseline(new BigDecimal("100"));contract.setWaterBaseline(new BigDecimal("20"));contracts.saveAndFlush(contract);
  draft=new ContractDraft();draft.setContract(contract);draft.setRentalRequest(request);draft.setSnapshotJson("{}");draft.setClausesJson("[]");draft.setDeposit(new BigDecimal("10000000"));draft.setPaymentDay(5);draft.setPaymentMethod("Transfer");draft.setUsagePurpose("Living");draft.setCreatedAt(Instant.now());draft.setOwnerSignedAt(Instant.now());draft.setCustomerSignedAt(Instant.now());draft.setOwnerSignature(new byte[]{1,2});draft.setCustomerSignature(new byte[]{3,4});draft.setSignedContentHash("a".repeat(64));drafts.saveAndFlush(draft);
 }
 private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail(UUID.randomUUID()+"@example.invalid");a.setFullName("Exit fixture "+role);a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setPasswordHash(hash);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);}
 private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Exit-test!12345").tokens().accessToken();}
 private String path(){return "/api/v1/contracts/"+contract.getId()+"/exit";}
 private String version(String actor)throws Exception{return json.readTree(mvc.perform(get(path()).header("Authorization",actor)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsString()).path("sourceVersion").asString();}
 private ResultActions act(String actor,String action,Map<String,Object> fields)throws Exception{return act(actor,action,version(actor),fields);}
 private ResultActions act(String actor,String action,String version,Map<String,Object> fields)throws Exception{var v=new LinkedHashMap<String,Object>(fields);v.put("action",action);v.put("sourceVersion",version);v.put("consent",true);return mvc.perform(post(path()+"/actions").header("Authorization",actor).contentType("application/json").content(json.writeValueAsString(v)));}
 private Map<String,Object> term(){return Map.of("termination",Map.of("returnDate",today.toString(),"reason","Move away","clauseReference","No notice clause; parties agree today","penaltyAmount","1000000","penaltyPayer","CUSTOMER"));}
 private Map<String,Object> hand(){return Map.of("handover",Map.of("returnDate",today.toString(),"electricityReading",110,"waterReading",22,"keysReturned",true,"conditionNotes","Room and inventory checked","evidenceIds",List.of(),"details",Map.of("location","28 Đường số 2, TP. Hồ Chí Minh","inventory","Máy lạnh, tủ và giường","keyCount",2,"notes","Hai bên kiểm tra đầy đủ")));}
 private static String signature()throws Exception{var image=new java.awt.image.BufferedImage(200,80,java.awt.image.BufferedImage.TYPE_INT_ARGB);var g=image.createGraphics();g.setColor(java.awt.Color.BLACK);g.fillRect(20,20,100,4);g.dispose();var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",bytes);return "data:image/png;base64,"+Base64.getEncoder().encodeToString(bytes.toByteArray());}
 private ResultActions sign(String actor)throws Exception{
  var data=json.readTree(mvc.perform(get(path()).header("Authorization",actor)).andReturn().getResponse().getContentAsString());
  return mvc.perform(post(path()+"/sign").header("Authorization",actor).contentType("application/json").content(json.writeValueAsString(Map.of("sourceVersion",data.path("sourceVersion").asString(),"contentHash",data.path("signing").path("contentHash").asString(),"signature",signature(),"consent",true))));
 }
 private ResultActions complete()throws Exception{sign(ot).andExpect(status().isOk()).andExpect(jsonPath("$.contractStatus").value("ACTIVE"));return sign(ct);}
 private void agree()throws Exception{act(ct,"PROPOSE_TERMINATION",term()).andExpect(status().isOk());act(ot,"ACCEPT_TERMINATION",Map.of()).andExpect(status().isOk());}
 private RentalInvoice invoice(RentalInvoice.Status state){var i=new RentalInvoice();i.setContract(contract);i.setPeriod(today.minusMonths(1).toString().substring(0,7));i.setDueDate(today.minusDays(1));i.setMonthlyRent(new BigDecimal("5000000"));i.setElectricityStartReading(new BigDecimal("90"));i.setElectricityEndReading(new BigDecimal("100"));i.setElectricityQuantity(new BigDecimal("10"));i.setElectricityUnitPrice(contract.getElectricityUnitPrice());i.setElectricityAmount(new BigDecimal("35000"));i.setWaterStartReading(new BigDecimal("19"));i.setWaterEndReading(new BigDecimal("20"));i.setWaterQuantity(BigDecimal.ONE);i.setWaterUnitPrice(contract.getWaterUnitPrice());i.setWaterAmount(new BigDecimal("15000"));i.setTotalAmount(new BigDecimal("5050000"));i.setCreatedAt(Instant.now());i.setStatus(state);if(state==RentalInvoice.Status.SENT)i.setSentAt(Instant.now());return invoices.saveAndFlush(i);}
 @Test void agreementDoesNotEndLeaseOrMoveMoneyUntilBilateralHandover()throws Exception{
  var debt=invoice(RentalInvoice.Status.SENT);var end=contract.getEndDate();var signed=draft.getSignedContentHash();var snapshot=draft.getSnapshotJson();
  act(ct,"PROPOSE_TERMINATION",term()).andExpect(status().isOk()).andExpect(jsonPath("$.terminationState").value("PENDING"));
  act(ct,"ACCEPT_TERMINATION",Map.of()).andExpect(status().isForbidden());act(ot,"ACCEPT_TERMINATION",Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.terminationState").value("AGREED"));
  assertEquals(RentalContract.Status.ACTIVE,contract.getStatus());assertEquals(Apartment.Availability.OCCUPIED,apartment.getAvailability());
  act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());act(ot,"CONFIRM_HANDOVER",Map.of()).andExpect(status().isConflict());complete().andExpect(status().isOk()).andExpect(jsonPath("$.contractStatus").value("ENDED"));
  assertEquals("EARLY_TERMINATION",contract.getEndReason());assertEquals(end,contract.getEndDate());assertEquals(Apartment.Availability.VACANT,apartment.getAvailability());assertEquals(Apartment.PublicationStatus.PUBLISHED,apartment.getPublicationStatus());assertEquals(110,apartment.getElectricityIndex());assertEquals(signed,draft.getSignedContentHash());assertEquals(snapshot,draft.getSnapshotJson());assertArrayEquals(new byte[]{1,2},draft.getOwnerSignature());assertEquals(RentalInvoice.Status.SENT,debt.getStatus());
  mvc.perform(get("/api/v1/invoices/"+debt.getId()).header("Authorization",ct)).andExpect(status().isOk()).andExpect(jsonPath("$.paymentStatus").value("UNPAID"));assertEquals(5,events.findByContractIdOrderByIdAsc(contract.getId()).size());
 }
 @Test void refusalAndWithdrawalKeepHistoryAndDoNotReleaseRoom()throws Exception{act(ot,"PROPOSE_TERMINATION",term()).andExpect(status().isOk());act(ct,"REJECT_TERMINATION",Map.of("reason","Need another date")).andExpect(status().isOk());act(ct,"PROPOSE_TERMINATION",term()).andExpect(status().isOk());act(ct,"WITHDRAW_TERMINATION",Map.of("reason","Continue renting")).andExpect(status().isOk()).andExpect(jsonPath("$.history.length()").value(4));assertEquals(RentalContract.Status.ACTIVE,contract.getStatus());assertEquals(Apartment.Availability.OCCUPIED,apartment.getAvailability());}
 @Test void unresolvedDisputeBlocksConfirmationAndRevisedHandoverNeedsFreshConsent()throws Exception{agree();act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());String old=version(ct);act(ct,"DISPUTE_HANDOVER",Map.of("reason","Meter reading incorrect")).andExpect(status().isOk()).andExpect(jsonPath("$.handoverState").value("DISPUTED"));act(ct,"CONFIRM_HANDOVER",Map.of()).andExpect(status().isConflict());assertEquals(Apartment.Availability.OCCUPIED,apartment.getAvailability());act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());act(ct,"CONFIRM_HANDOVER",old,Map.of()).andExpect(status().isConflict());complete().andExpect(status().isOk()).andExpect(jsonPath("$.history.length()").value(7));}
 @Test void foreignAdminHasNoAdjudicationRightsAndCannotReadOrAct()throws Exception{mvc.perform(get(path()).header("Authorization",xt)).andExpect(status().isNotFound());act(xt,"PROPOSE_TERMINATION","a".repeat(64),term()).andExpect(status().isNotFound());mvc.perform(get(path())).andExpect(status().isUnauthorized());}
 @Test void pendingExitBlocksRenewalAndLegacyHandoverWithoutChangingSignedTerms()throws Exception{act(ct,"PROPOSE_TERMINATION",term()).andExpect(status().isOk());mvc.perform(post("/api/v1/contracts/"+contract.getId()+"/renewal-request").header("Authorization",ct).contentType("application/json").content("{\"version\":"+contract.getVersion()+",\"message\":\"Renew\",\"consent\":true}")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OPEN_CONTRACT_EXIT"));}
 @Test void existingRenewalPreventsExitAndPrematureHandoverIsRejected()throws Exception{act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isConflict());var r=new ContractRenewalRequest();r.setContractId(contract.getId());r.setStatus(ContractRenewalRequest.Status.PENDING);r.setMessage("renew");r.setCreatedAt(Instant.now());renewals.saveAndFlush(r);act(ct,"PROPOSE_TERMINATION",term()).andExpect(status().isConflict());}
 @Test void draftInvoicesBlockHandoverButSentUnpaidInvoicesDoNot()throws Exception{agree();var i=invoice(RentalInvoice.Status.DRAFT);act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OPEN_INVOICE_DRAFT"));i.setStatus(RentalInvoice.Status.SENT);i.setSentAt(Instant.now());invoices.saveAndFlush(i);act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());}
 @Test void missingBaselineNeverDefaultsToZeroAndChangedSourceNeedsNewReport()throws Exception{agree();contract.setElectricityBaseline(null);contracts.saveAndFlush(contract);act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("METER_BASELINE_MISSING"));contract.setElectricityBaseline(new BigDecimal("100"));contracts.saveAndFlush(contract);act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());contract.setElectricityBaseline(new BigDecimal("101"));contracts.saveAndFlush(contract);sign(ct).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("HANDOVER_SOURCE_CHANGED"));}
 @Test void evidenceIsValidatedPrivateAndBoundToUploaderAndContract()throws Exception{
  mvc.perform(multipart(path()+"/evidence").file(new MockMultipartFile("file","bad.png","image/png",new byte[]{1,2})).header("Authorization",ot)).andExpect(status().isBadRequest());
  var image=new java.awt.image.BufferedImage(20,20,java.awt.image.BufferedImage.TYPE_INT_RGB);var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);
  var response=mvc.perform(multipart(path()+"/evidence").file(new MockMultipartFile("file","test.png","image/png",out.toByteArray())).header("Authorization",ot)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();String id=json.readTree(response).path("id").asString();
  mvc.perform(get(path()+"/evidence/"+id).header("Authorization",ct)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));mvc.perform(get(path()+"/evidence/"+id).header("Authorization",xt)).andExpect(status().isNotFound());
  agree();act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());act(ct,"DISPUTE_HANDOVER",Map.of("reason","Disagree","evidenceIds",List.of(Long.valueOf(id)))).andExpect(status().isNotFound());
 }
 @Test void datesReasonsConsentAndStaleVersionsAreChecked()throws Exception{String stale=version(ct);act(ct,"PROPOSE_TERMINATION",term()).andExpect(status().isOk());act(ot,"ACCEPT_TERMINATION",stale,Map.of()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));act(ot,"REJECT_TERMINATION",Map.of()).andExpect(status().isBadRequest());mvc.perform(post(path()+"/actions").header("Authorization",ot).contentType("application/json").content(json.writeValueAsString(Map.of("action","ACCEPT_TERMINATION","sourceVersion",version(ot),"consent",false)))).andExpect(status().isBadRequest());}
 @Test void normalExpiryAlsoUsesPhysicalHandoverWithoutDepositSettlement()throws Exception{contract.setEndDate(today);contracts.saveAndFlush(contract);act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk()).andExpect(jsonPath("$.handover.utilityAmount").value("65000.0000"));complete().andExpect(status().isOk());assertEquals("HANDOVER",contract.getEndReason());assertEquals(0,new BigDecimal("10000000").compareTo(draft.getDeposit()));assertEquals(0,jdbc.queryForObject("select count(*) from contract_handovers where contract_id=?",Integer.class,contract.getId()));}
 @Test void counterpartReceivesPrivateInAppNoticeAndEndedLeaseCannotExitAgain()throws Exception{agree();mvc.perform(get("/api/v1/me/notifications").header("Authorization",ct)).andExpect(status().isOk());act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());complete().andExpect(status().isOk());act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isConflict());}
 @Test void optionalMetersPdfAndCustomerFirstSignaturesAreBoundToExactContent()throws Exception{
  contract.setEndDate(today.minusDays(1));contract.setElectricityBaseline(null);contract.setWaterBaseline(null);contracts.saveAndFlush(contract);
  var fields=new LinkedHashMap<String,Object>((Map<String,Object>)hand().get("handover"));fields.remove("electricityReading");fields.remove("waterReading");
  act(ot,"PROPOSE_HANDOVER",Map.of("handover",fields)).andExpect(status().isOk()).andExpect(jsonPath("$.document.details.keyCount").value(2));
  act(ct,"CONFIRM_HANDOVER",Map.of()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("HANDOVER_SIGNATURES_REQUIRED"));
  sign(ct).andExpect(status().isOk()).andExpect(jsonPath("$.signing.state").value("WAITING_OWNER"));
  assertEquals(RentalContract.Status.ACTIVE,contract.getStatus());assertEquals(Apartment.Availability.OCCUPIED,apartment.getAvailability());
  sign(ct).andExpect(status().isConflict());
  mvc.perform(get(path()+"/pdf").header("Authorization",xt)).andExpect(status().isNotFound());
  var bytes=mvc.perform(get(path()+"/pdf").header("Authorization",ot)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsByteArray();
  try(var pdf=org.apache.pdfbox.Loader.loadPDF(bytes)){var text=new org.apache.pdfbox.text.PDFTextStripper().getText(pdf);assertTrue(text.contains("BIÊN BẢN BÀN GIAO LẠI NHÀ THUÊ"));assertTrue(text.contains("Máy lạnh, tủ và giường"));assertTrue(text.contains("Chưa ký"));}
  sign(ot).andExpect(status().isOk()).andExpect(jsonPath("$.signing.state").value("SIGNED")).andExpect(jsonPath("$.contractStatus").value("ENDED"));
  bytes=mvc.perform(get(path()+"/pdf").header("Authorization",ct)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
  java.nio.file.Files.write(java.nio.file.Path.of("target/handover-signed-preview.pdf"),bytes);
 }
 @Test void fractionalInvoiceBaselinesRemainExactDuringBothSignatures()throws Exception{
  agree();contract.setElectricityBaseline(new BigDecimal("100.25"));contract.setWaterBaseline(new BigDecimal("20.50"));contracts.saveAndFlush(contract);
  act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk()).andExpect(jsonPath("$.handover.electricityStartReading").value("100.25"));
  complete().andExpect(status().isOk()).andExpect(jsonPath("$.contractStatus").value("ENDED"));
 }
 @Test void invalidOrForeignSignaturesAndLegacyPendingCannotCompleteLease()throws Exception{
  agree();act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());
  var data=json.readTree(mvc.perform(get(path()).header("Authorization",ct)).andReturn().getResponse().getContentAsString());
  var body=new LinkedHashMap<String,Object>();body.put("sourceVersion",data.path("sourceVersion").asString());body.put("contentHash",data.path("signing").path("contentHash").asString());body.put("signature","data:image/png;base64,invalid");body.put("consent",true);
  mvc.perform(post(path()+"/sign").header("Authorization",xt).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isNotFound());
  mvc.perform(post(path()+"/sign").header("Authorization",ct).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_SIGNATURE"));
  body.put("signature",signature());body.put("consent",false);
  mvc.perform(post(path()+"/sign").header("Authorization",ct).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
  var root=cases.findById(contract.getId()).orElseThrow();root.setDocumentJson(null);root.setDocumentHash(null);cases.saveAndFlush(root);
  act(ct,"CONFIRM_HANDOVER",Map.of()).andExpect(status().isConflict());
  mvc.perform(get(path()).header("Authorization",ot)).andExpect(jsonPath("$.canProposeHandover").value(true));
  assertEquals(RentalContract.Status.ACTIVE,contract.getStatus());
 }
 @Test void disputeAndReplacementClearBothSignaturesAndOldHashCannotSign()throws Exception{
  agree();act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk());sign(ot).andExpect(status().isOk());
  var old=json.readTree(mvc.perform(get(path()).header("Authorization",ct)).andReturn().getResponse().getContentAsString());
  act(ct,"DISPUTE_HANDOVER",Map.of("reason","Kiểm tra lại thiết bị")).andExpect(status().isOk()).andExpect(jsonPath("$.signing.ownerSignedAt").isEmpty());
  act(ot,"PROPOSE_HANDOVER",hand()).andExpect(status().isOk()).andExpect(jsonPath("$.signing.state").value("UNSIGNED"));
  mvc.perform(post(path()+"/sign").header("Authorization",ct).contentType("application/json").content(json.writeValueAsString(Map.of("sourceVersion",old.path("sourceVersion").asString(),"contentHash",old.path("signing").path("contentHash").asString(),"signature",signature(),"consent",true)))).andExpect(status().isConflict());
  assertEquals(RentalContract.Status.ACTIVE,contract.getStatus());
 }
 @Test void concurrentProposalsUseOneParentLockAndNeverReplaceTheOtherPartysProposal()throws Exception{
  String source=version(ct);TestTransaction.flagForCommit();TestTransaction.end();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
  try{var a=pool.submit(()->{gate.await();return act(ot,"PROPOSE_TERMINATION",source,term()).andReturn().getResponse().getStatus();});var b=pool.submit(()->{gate.await();return act(ct,"PROPOSE_TERMINATION",source,term()).andReturn().getResponse().getStatus();});gate.countDown();var statuses=new ArrayList<>(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS)));Collections.sort(statuses);assertEquals(List.of(200,409),statuses);assertEquals(1,jdbc.queryForObject("select count(*) from contract_exit_events where contract_id=?",Integer.class,contract.getId()));assertEquals("OCCUPIED",jdbc.queryForObject("select availability from rental_apartments where id=?",String.class,apartment.getId()));}
  finally{pool.shutdownNow();Long id=contract.getId();jdbc.update("delete from contract_exit_events where contract_id=?",id);jdbc.update("delete from contract_exit_cases where contract_id=?",id);jdbc.update("delete from contract_drafts where contract_id=?",id);jdbc.update("delete from rental_contracts where id=?",id);jdbc.update("delete from rental_requests where id=?",request.getId());jdbc.update("delete from rental_apartment_amenities where apartment_id=?",apartment.getId());jdbc.update("delete from rental_apartments where id=?",apartment.getId());jdbc.update("delete from rental_properties where id=?",apartment.getProperty().getId());for(var a:List.of(owner,customer,other)){jdbc.update("delete from auth_refresh_tokens where session_id in(select id from auth_sessions where account_id=?)",a.getId());jdbc.update("delete from auth_sessions where account_id=?",a.getId());jdbc.update("delete from auth_account_roles where account_id=?",a.getId());jdbc.update("delete from auth_accounts where id=?",a.getId());}}
 }
}
