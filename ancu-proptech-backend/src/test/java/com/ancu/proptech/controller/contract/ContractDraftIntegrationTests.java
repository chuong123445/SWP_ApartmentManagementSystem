package com.ancu.proptech.controller.contract;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.service.auth.AuthService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class ContractDraftIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired PropertyDossierRepository dossiers;
    @Autowired ApartmentRepository apartments;
    @Autowired RentalRequestRepository requests;
    @Autowired RentalContractRepository contracts;
    @Autowired ContractDraftRepository drafts;
    @Autowired com.ancu.proptech.repository.identity.IdentityProfileRepository identities;
    @Autowired AuthService auth;
    @Autowired PasswordEncoder passwords;
    private AuthAccount owner,customer,other;
    private RentalRequest request;
    private String token,customerToken,otherToken;
    private static String hash;
    private static final String PASSWORD="Contract-test!12345";
    @BeforeEach void fixture() {
        if(hash==null) hash=passwords.encode(PASSWORD);
        owner=account(AuthAccount.Role.OWNER);customer=account(AuthAccount.Role.CUSTOMER);other=account(AuthAccount.Role.OWNER);
        token=bearer(owner);customerToken=bearer(customer);otherToken=bearer(other);
        var p=new Property();p.setOwner(owner);p.setName("Tài sản kiểm thử");p.setAddress("12 Đường Kiểm Thử");p.setCity("Test city");p.setDistrict("Test district");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(p);
        var a=new Apartment();a.setProperty(p);a.setTitle("Căn hộ kiểm thử");a.setDescription("Đã lưu");a.setRoomNumber("A.101");a.setAreaM2(new BigDecimal("42.50"));a.setAdvertisedMonthlyRent(new BigDecimal("6000000"));a.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);a.setAvailability(Apartment.Availability.CONTRACT_IN_PROGRESS);a.setCreatedAt(Instant.now());apartments.saveAndFlush(a);
        request=new RentalRequest();request.setApartment(a);request.setCustomer(customer);request.setStatus(RentalRequest.Status.ACCEPTED);request.setMessage("");request.setCreatedAt(Instant.now());requests.saveAndFlush(request);
    }
    private AuthAccount account(AuthAccount.Role role) { var a=new AuthAccount();a.setEmail(UUID.randomUUID()+"@example.invalid");a.setFullName("Thông tin đã lưu "+role);a.setPhone("0912345678");a.setAddress("Địa chỉ hồ sơ");a.setPasswordHash(hash);a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a); }
    private String bearer(AuthAccount a) { return "Bearer "+auth.login(a.getEmail(),PASSWORD).tokens().accessToken(); }
    private String context() throws Exception { return mvc.perform(get("/api/v1/owner/rental-requests/"+request.getId()+"/contract-context").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(); }
    @Test void cannotCreateContractBeyondApprovedRights()throws Exception{
        var p=request.getApartment().getProperty();p.setRightType(PropertyDossier.RightType.AUTHORIZATION);p.setRightsValidFrom(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1));p.setRightsValidUntil(LocalDate.of(2027,10,31));properties.flush();
        create(token,body(context())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_EXCEEDS_PROPERTY_RIGHTS"));
    }
    @Test void contractEndingOnRightsEndIsAllowedButUpdateBeyondItIsRejected()throws Exception{
        var p=request.getApartment().getProperty();p.setRightType(PropertyDossier.RightType.AUTHORIZATION);p.setRightsValidFrom(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1));p.setRightsValidUntil(LocalDate.of(2027,11,1));properties.flush();
        String saved=create(token,body(context())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        update(id(saved),0,terms().replace("2027-11-01","2027-11-02")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_EXCEEDS_PROPERTY_RIGHTS"));
    }
    private String terms() { return """
        "startDate":"2026-11-01","endDate":"2027-11-01","monthlyRent":"6200000.50","electricityUnitPrice":"3500","waterUnitPrice":"15000","deposit":"10000000","paymentDay":5,"paymentMethod":"Chuyển khoản","usagePurpose":"Để ở","clauses":[{"title":"Điều khoản riêng","body":"Không hút thuốc trong căn hộ."}]
        """.strip(); }
    private String body(String ctx) { return "{\"requestVersion\":"+request.getVersion()+",\"sourceVersion\":\""+JsonPath.read(ctx,"$.sourceVersion")+"\","+terms()+"}"; }
    private ResultActions create(String authHeader,String input) throws Exception { return mvc.perform(post("/api/v1/owner/rental-requests/"+request.getId()+"/contract").header("Authorization",authHeader).contentType("application/json").content(input)); }
    private String create() throws Exception { return create(token,body(context())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(); }
    private String id(String value) { return JsonPath.read(value,"$.id"); }
    private ResultActions update(String id,long version,String value) throws Exception { return mvc.perform(put("/api/v1/owner/contracts/"+id+"/draft").header("Authorization",token).contentType("application/json").content("{\"version\":"+version+","+value+"}")); }
    @Test void contextReusesStoredDataAndProvidesAtLeastFiveEditableClausesWithoutSecrets() throws Exception {
        String ctx=context();assertTrue(((List<?>)JsonPath.read(ctx,"$.templateClauses")).size()>=5);
        assertEquals(owner.getFullName(),JsonPath.read(ctx,"$.snapshot.owner.fullName"));assertEquals(customer.getPhone(),JsonPath.read(ctx,"$.snapshot.customer.phone"));assertEquals("42.50",JsonPath.read(ctx,"$.snapshot.asset.areaM2"));
        assertFalse(ctx.contains("passwordHash"));assertFalse(ctx.contains("snapshotJson"));assertFalse(ctx.contains("files"));
        mvc.perform(get("/api/v1/owner/rental-requests/"+request.getId()+"/contract-context").header("Authorization",token)).andExpect(header().string("Cache-Control","no-store"));
    }
    @Test void draftPersistsAcceptedSelectionAndNeverActivatesApartmentOrInventsBaselines() throws Exception {
        String result=create();var c=contracts.findById(UUID.fromString(id(result))).orElseThrow();
        assertEquals(RentalContract.Status.DRAFT,c.getStatus());assertFalse(c.isLocalFixture());assertNull(c.getElectricityBaseline());assertNull(c.getWaterBaseline());
        assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,request.getApartment().getAvailability());assertEquals(customer.getId(),c.getCustomer().getId());
        assertEquals("Điều khoản riêng",JsonPath.read(result,"$.clauses[0].title"));assertEquals("10000000",JsonPath.read(result,"$.deposit"));
        assertEquals(id(result),JsonPath.read(context(),"$.existingDraft.id"));
    }
    @Test void snapshotIsStableAfterAccountAndAssetChangesAndAfterEditingTermsOnly() throws Exception {
        String result=create();owner.setFullName("Tên mới");accounts.saveAndFlush(owner);request.getApartment().getProperty().setAddress("Địa chỉ mới");properties.saveAndFlush(request.getApartment().getProperty());
        update(id(result),0,terms().replace("Không hút thuốc","Điều khoản mới")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.snapshot.owner.fullName").value("Thông tin đã lưu OWNER")).andExpect(jsonPath("$.snapshot.asset.address").value("12 Đường Kiểm Thử"));
        assertEquals(0,contracts.findById(UUID.fromString(id(result))).orElseThrow().getBillingVersion());
    }
    @Test void partiesOnlyCanReadAndOnlyOwnerCanEdit() throws Exception {
        String result=create();String id=id(result);
        mvc.perform(get("/api/v1/contracts/"+id).header("Authorization",customerToken)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/contracts/"+id).header("Authorization",otherToken)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/contracts/"+id)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/owner/contracts/"+id+"/draft").header("Authorization",customerToken).contentType("application/json").content("{\"version\":0,"+terms()+"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/owner/contracts/"+id+"/draft").header("Authorization",otherToken).contentType("application/json").content("{\"version\":0,"+terms()+"}")).andExpect(status().isNotFound());
    }
    @Test void listsStayScopedAndPropertyFilterNeverExpandsOwnership() throws Exception {
        create();mvc.perform(get("/api/v1/owner/contract-drafts").header("Authorization",otherToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/owner/contract-drafts").header("Authorization",token).param("propertyId",UUID.randomUUID().toString())).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/me/contract-drafts").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/me/contract-drafts").header("Authorization",bearer(account(AuthAccount.Role.CUSTOMER)))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void duplicateSelectionCannotCreateAnotherContract() throws Exception {
        String body=body(context());create(token,body).andExpect(status().isCreated());create(token,body).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_ALREADY_EXISTS"));
        assertEquals(1,contracts.findByApartmentId(request.getApartment().getId()).size());
    }
    @Test void nonAcceptedRequestsAndUnselectedApartmentAreRejected() throws Exception {
        String body=body(context());request.setStatus(RentalRequest.Status.PENDING);requests.saveAndFlush(request);create(token,body.replace("\"requestVersion\":0","\"requestVersion\":"+request.getVersion())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REQUEST_NOT_ACCEPTED"));
        request.setStatus(RentalRequest.Status.ACCEPTED);requests.saveAndFlush(request);String selected=body(context());request.getApartment().setAvailability(Apartment.Availability.VACANT);apartments.saveAndFlush(request.getApartment());create(token,selected).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("APARTMENT_NOT_SELECTED"));
    }
    @Test void staleSourceAndRequestVersionDoNotSavePartialContracts() throws Exception {
        String body=body(context());customer.setPhone("0987654321");accounts.saveAndFlush(customer);create(token,body).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOURCE_CHANGED"));
        create(token,body(context()).replace("\"requestVersion\":0","\"requestVersion\":99")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));assertTrue(contracts.findByApartmentId(request.getApartment().getId()).isEmpty());
    }
    @Test void lockedOrUnverifiedCustomerCannotGainContract() throws Exception {
        String input=body(context());customer.setEmailVerified(false);accounts.saveAndFlush(customer);create(token,input).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CUSTOMER_NOT_ELIGIBLE"));
        customer.setEmailVerified(true);customer.setStatus(AuthAccount.Status.LOCKED);accounts.saveAndFlush(customer);create(token,body(context())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CUSTOMER_NOT_ELIGIBLE"));
    }
    @Test void forgedPartyStatusTotalsAndUnknownClauseFieldsAreRejected() throws Exception {
        String input=body(context());for(String field:List.of("ownerId","customerId","apartmentId","status","snapshot","totalAmount")) create(token,input.replace("\"requestVersion\":","\""+field+"\":\"forged\",\"requestVersion\":")).andExpect(status().isBadRequest());
        create(token,input.replace("\"title\":","\"signed\":true,\"title\":")).andExpect(status().isBadRequest());create(otherToken,input).andExpect(status().isNotFound());create(customerToken,input).andExpect(status().isForbidden());
    }
    @Test void datesDecimalsClausesAndIntegerVersionsValidate() throws Exception {
        String input=body(context());for(String invalid:List.of(input.replace("2027-11-01","2026-10-01"),input.replace("6200000.50","6200000.501"),input.replace("\"deposit\":\"10000000\"","\"deposit\":\"-1\""),input.replace("\"paymentDay\":5","\"paymentDay\":29"),input.replace("\"paymentDay\":5","\"paymentDay\":5.1"),input.replace("\"requestVersion\":0","\"requestVersion\":0.0"),input.replace("\"requestVersion\":0","\"requestVersion\":\"0\""),input.replace("Không hút thuốc trong căn hộ."," "))) create(token,invalid).andExpect(status().isBadRequest());
    }
    @Test void staleEditsAndNonDraftContractsCannotChangeContent() throws Exception {
        String result=create();update(id(result),0,terms().replace("6200000.50","6500000")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));update(id(result),0,terms()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));
        var c=contracts.findById(UUID.fromString(id(result))).orElseThrow();c.setStatus(RentalContract.Status.ENDED);contracts.saveAndFlush(c);update(id(result),1,terms()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_NOT_DRAFT"));
    }
    @Test void approvedDossierReceivingAccountIsReusedWithoutPrivateEvidence() throws Exception {
        var d=new PropertyDossier();d.setProperty(request.getApartment().getProperty());d.setApplicantName(owner.getFullName());d.setRightType(PropertyDossier.RightType.AUTHORIZATION);d.setBank("Ngân hàng đã lưu");d.setAccountNumber("123456789");d.setAccountHolderName(owner.getFullName());d.setStatus(PropertyDossier.Status.APPROVED);d.setSubmittedAt(Instant.now());dossiers.saveAndFlush(d);
        mvc.perform(get("/api/v1/owner/rental-requests/"+request.getId()+"/contract-context").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.snapshot.receivingAccount.accountNumber").value("123456789")).andExpect(jsonPath("$.snapshot.asset.exploitationRight").value("AUTHORIZATION"));
    }
    @Test void identityAndCertificateAreServerDerivedStaleCheckedAndFrozenWithoutImages() throws Exception {
        var identity=new com.ancu.proptech.model.identity.IdentityProfile();identity.setAccountId(customer.getId());identity.setLegalName("Tên trên căn cước mẫu");identity.setDocumentNumber("999000000001");identity.setDateOfBirth(LocalDate.of(1995,6,15));identity.setIssueDate(LocalDate.of(2022,5,1));identity.setIssuePlace("Cơ quan mẫu");identity.setPermanentAddress("Địa chỉ trên giấy tờ");identity.setCurrentAddress("Địa chỉ sinh sống mẫu");identity.setUpdatedAt(Instant.now());identity.setLocalFixture(true);identity=identities.saveAndFlush(identity);
        var d=new PropertyDossier();d.setProperty(request.getApartment().getProperty());d.setApplicantName(owner.getFullName());d.setRightType(PropertyDossier.RightType.OWNERSHIP);d.setBank("Ngân hàng mẫu");d.setAccountNumber("00000001");d.setAccountHolderName(owner.getFullName());d.setStatus(PropertyDossier.Status.APPROVED);d.setSubmittedAt(Instant.now());d.setCertificateNumber("MAU-GCN-001");d.setCertificateIssueDate(LocalDate.of(2020,1,15));d.setCertificateIssuePlace("Cơ quan cấp mẫu");d.setExploitationRightDescription("Quyền cho thuê minh họa");d.setLocalFixture(true);d=dossiers.saveAndFlush(d);
        String ctx=context();assertEquals("999000000001",JsonPath.read(ctx,"$.snapshot.customer.documentNumber"));assertEquals("Tên trên căn cước mẫu",JsonPath.read(ctx,"$.snapshot.customer.fullName"));assertEquals("NOT_VERIFIED",JsonPath.read(ctx,"$.snapshot.customer.identityVerificationStatus"));assertEquals(true,JsonPath.read(ctx,"$.snapshot.customer.localFixture"));assertEquals("MAU-GCN-001",JsonPath.read(ctx,"$.snapshot.asset.certificateNumber"));assertFalse(ctx.contains("frontContent"));assertFalse(ctx.contains("backContent"));
        identity.setIssuePlace("Nơi cấp mới");identities.saveAndFlush(identity);create(token,body(ctx)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOURCE_CHANGED"));
        String result=create();identity.setDocumentNumber("999000000002");identities.saveAndFlush(identity);d.setCertificateNumber("MAU-GCN-002");dossiers.saveAndFlush(d);
        mvc.perform(get("/api/v1/contracts/"+id(result)).header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.snapshot.customer.documentNumber").value("999000000001")).andExpect(jsonPath("$.snapshot.asset.certificateNumber").value("MAU-GCN-001"));
        mvc.perform(get("/api/v1/contracts/"+id(result)).header("Authorization",otherToken)).andExpect(status().isNotFound());
    }
    @Test void legacyStoredSnapshotsWithoutNewLegalFieldsRemainReadable() throws Exception {
        String result=create();var draft=drafts.findByContractId(UUID.fromString(id(result))).orElseThrow();
        draft.setSnapshotJson(draft.getSnapshotJson().replaceAll(",\"(?:documentNumber|documentIssueDate|documentIssuePlace|permanentAddress|identityVerificationStatus|localFixture|certificateNumber|certificateIssueDate|certificateIssuePlace|exploitationRightDescription)\":null",""));drafts.saveAndFlush(draft);
        mvc.perform(get("/api/v1/contracts/"+id(result)).header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.snapshot.owner.fullName").value(owner.getFullName())).andExpect(jsonPath("$.snapshot.asset.certificateNumber").isEmpty());
    }
}
