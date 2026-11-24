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

@SpringBootTest(properties="app.auth.otp-secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=") @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class ContractDraftIntegrationTests {
 @org.springframework.test.context.bean.override.mockito.MockitoBean com.ancu.proptech.service.auth.EmailOtpSender otpSender;
 @Autowired com.ancu.proptech.repository.auth.ActionOtpChallengeRepository otpChallenges;
 private String otpCode;
 @org.springframework.test.context.bean.override.mockito.MockitoSpyBean com.ancu.proptech.service.contract.SigningOtpPolicy signingOtpPolicy;
 @BeforeEach void otpSetup(){org.mockito.Mockito.when(otpSender.isConfigured()).thenReturn(true);org.mockito.Mockito.doAnswer(call->{otpCode=call.getArgument(1);return null;}).when(otpSender).sendAction(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString());}
 private void expireOtpCooldown(){otpChallenges.findAll().forEach(c->{c.setCreatedAt(Instant.now().minusSeconds(1000));});otpChallenges.flush();}

    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.ancu.proptech.service.property.ai.DossierAiClient dossierAiClient;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean com.ancu.proptech.service.property.PropertyRightsPolicy signingDates;
    @Autowired com.ancu.proptech.service.billing.InvoiceService packageInvoices;
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired com.ancu.proptech.repository.property.OwnerPaymentQrRepository paymentQrs;
    @Autowired PropertyDossierRepository dossiers;
    @Autowired ApartmentRepository apartments;
    @Autowired RentalRequestRepository requests;
    @Autowired RentalContractRepository contracts;
    @Autowired ContractDraftRepository drafts;
    @Autowired ContractRenewalRequestRepository renewalRequests;
    @Autowired com.ancu.proptech.service.contract.ContractExpiryService expiryNotices;
    @Autowired com.ancu.proptech.service.contract.ContractRenewalActivationService renewalActivation;
    @Autowired com.ancu.proptech.service.contract.ContractInitialActivationService initialActivation;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired com.ancu.proptech.repository.contract.ContractHandoverRepository handovers;
    @Autowired com.ancu.proptech.repository.identity.IdentityProfileRepository identities;
    @Autowired AuthService auth;
    @Autowired com.ancu.proptech.repository.auth.ExternalIdentityRepository verifiedIdentities;
    @Autowired PasswordEncoder passwords;
    private AuthAccount owner,customer,other;
    private RentalRequest request;
    private String token,customerToken,otherToken;
    private static String hash;
    private static final String PASSWORD="Contract-test!12345";
    @Test void dualRoleTenantSignsTheirOwnSlotWithoutManagingOtherOwnersContract()throws Exception {
        customer.setRole(AuthAccount.Role.OWNER);accounts.saveAndFlush(customer);
        String saved=create();String hash=JsonPath.read(saved,"$.signing.contentHash");
        sign(saved,token,hash,signature(),true).andExpect(status().isOk());
        sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/v1/me/contract-drafts").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/owner/contract-drafts").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/owner/contracts/"+id(saved)+"/billing-context").header("Authorization",customerToken)).andExpect(status().isNotFound());
        assertEquals(Set.of(AuthAccount.Role.OWNER,AuthAccount.Role.CUSTOMER),customer.getRoles());
    }
    @Test void customerRequestInboxKeepsUnsignedDraftUntilBothSignaturesBeforePaging()throws Exception {
        String saved=create();
        for(var state:List.of(RentalRequest.Status.REJECTED,RentalRequest.Status.CANCELLED)){
            var r=new RentalRequest();r.setApartment(request.getApartment());r.setCustomer(customer);r.setStatus(state);r.setMessage("Request history without a contract");r.setCreatedAt(Instant.now());requests.saveAndFlush(r);
        }
        for(int phase=0;phase<2;phase++){
            var ids=new HashSet<String>();
            for(int page=0;page<3;page++){
                var result=mvc.perform(get("/api/v1/me/rental-requests").header("Authorization",customerToken).param("size","1").param("page",Integer.toString(page)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3)).andExpect(jsonPath("$.totalPages").value(3)).andExpect(jsonPath("$.items.length()").value(1)).andReturn().getResponse().getContentAsString();
                ids.add(JsonPath.read(result,"$.items[0].id"));
            }
            assertTrue(ids.contains(request.getId().toString()));assertEquals(3,ids.size());
            if(phase==0)saved=sign(saved,token,JsonPath.read(saved,"$.signing.contentHash"),signature(),true).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        }
        mvc.perform(get("/api/v1/contracts/"+id(saved)).header("Authorization",customerToken)).andExpect(status().isOk());
        saved=sign(saved,customerToken,JsonPath.read(saved,"$.signing.contentHash"),signature(),true).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization",customerToken).param("size","1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.items[0].contractId").isEmpty());
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization",otherToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/me/contract-drafts").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id(saved)));
        assertTrue(requests.existsById(request.getId()));
    }
    @BeforeEach void fixture() {
        if(hash==null) hash=passwords.encode(PASSWORD);
        owner=account(AuthAccount.Role.OWNER);customer=account(AuthAccount.Role.CUSTOMER);other=account(AuthAccount.Role.OWNER);
        token=bearer(owner);customerToken=bearer(customer);otherToken=bearer(other);
        var p=new Property();p.setOwner(owner);p.setName("Tài sản kiểm thử");p.setAddress("12 Đường Kiểm Thử");p.setCity("Test city");p.setDistrict("Test district");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(p);
        var a=new Apartment();a.setProperty(p);a.setTitle("Căn hộ kiểm thử");a.setDescription("Đã lưu");a.setRoomNumber("A.101");a.setAreaM2(new BigDecimal("42.50"));a.setAdvertisedMonthlyRent(new BigDecimal("6000000"));a.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);a.setAvailability(Apartment.Availability.CONTRACT_IN_PROGRESS);a.setCreatedAt(Instant.now());apartments.saveAndFlush(a);
        request=new RentalRequest();request.setApartment(a);request.setCustomer(customer);request.setStatus(RentalRequest.Status.ACCEPTED);request.setMessage("");request.setCreatedAt(Instant.now());requests.saveAndFlush(request);
    }
    private AuthAccount account(AuthAccount.Role role) { var a=new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Thông tin đã lưu "+role);a.setPhone("0912345678");a.setAddress("Địa chỉ hồ sơ");a.setPasswordHash(hash);a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a); }
    private String bearer(AuthAccount a) { return "Bearer "+auth.login(a.getEmail(),PASSWORD).tokens().accessToken(); }
    @Test void configuredRatesAndServiceChargesArePartOfTheSignedDocument()throws Exception {
        Long propertyId=request.getApartment().getProperty().getId();
        mvc.perform(put("/api/v1/owner/properties/"+propertyId+"/settings").header("Authorization",token).contentType("application/json").content("{\"version\":0,\"electricityUnitPrice\":\"3500\",\"waterUnitPrice\":\"50000\",\"internetFee\":\"100000\",\"garbageFee\":\"30000\",\"waterBillingMode\":\"PER_PERSON\"}")).andExpect(status().isOk());
        String ctx=context();assertEquals("PER_PERSON",JsonPath.read(ctx,"$.suggestedRates.waterBillingMode"));
        String input=body(ctx).replace("\"waterUnitPrice\":\"15000\"","\"waterUnitPrice\":\"50000\",\"waterBillingMode\":\"PER_PERSON\",\"occupantCount\":2,\"internetFee\":\"100000\",\"garbageFee\":\"30000\"");
        create(token,input).andExpect(status().isCreated()).andExpect(jsonPath("$.waterBillingMode").value("PER_PERSON")).andExpect(jsonPath("$.occupantCount").value(2));
    }
    @Test void confirmedQrSnapshotIsPrivateAndSurvivesOwnerQrReplacement()throws Exception {
        var qr=new com.ancu.proptech.model.property.OwnerPaymentQr();qr.setOwnerId(owner.getId());qr.setBankBin("970422");qr.setBank("MBBank");qr.setAccountNumber("00123456789");qr.setAccountHolderName("OWNER TEST");qr.setContentType("image/png");qr.setContent(new byte[]{1,2,3});qr.setAiStatus("NOT_REQUESTED");qr.setCreatedAt(Instant.now());qr.setConfirmedAt(Instant.now());paymentQrs.saveAndFlush(qr);
        String saved=create();assertEquals(qr.getId().toString(),JsonPath.read(saved,"$.snapshot.ownerPaymentQrId"));assertEquals("00123456789",JsonPath.read(saved,"$.snapshot.receivingAccount.accountNumber"));
        var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();c.setStatus(RentalContract.Status.ACTIVE);c.setBaselineDate(c.getStartDate());c.setElectricityBaseline(BigDecimal.ZERO);c.setWaterBaseline(BigDecimal.ZERO);contracts.saveAndFlush(c);
        String invoiceBody="{\"period\":\"2026-11\",\"dueDate\":\"2026-11-28\",\"electricityEndReading\":\"0\",\"waterEndReading\":\"0\",\"baselineVersion\":0}";
        String inv=mvc.perform(post("/api/v1/owner/contracts/"+c.getId()+"/invoices").header("Authorization",token).contentType("application/json").content(invoiceBody)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();String invoiceId=JsonPath.read(inv,"$.id");
        String url="/api/v1/invoices/"+invoiceId+"/payment-qr";
        mvc.perform(get(url).header("Authorization",otherToken)).andExpect(status().isNotFound());mvc.perform(get(url).header("Authorization",customerToken)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/owner/invoices/"+invoiceId+"/send").header("Authorization",token).contentType("application/json").content("{\"version\":0}")).andExpect(status().isOk());
        mvc.perform(get(url).header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(content().bytes(new byte[]{1,2,3}));
        var next=new com.ancu.proptech.model.property.OwnerPaymentQr();next.setOwnerId(owner.getId());next.setBankBin("970422");next.setBank("MBBank");next.setAccountNumber("999999");next.setAccountHolderName("NEW OWNER TEST");next.setContentType("image/png");next.setContent(new byte[]{4,5});next.setAiStatus("NOT_REQUESTED");next.setCreatedAt(Instant.now());next.setConfirmedAt(Instant.now().plusSeconds(1));paymentQrs.saveAndFlush(next);
        mvc.perform(get(url).header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(content().bytes(new byte[]{1,2,3}));
    }
    private String context() throws Exception { return mvc.perform(get("/api/v1/owner/rental-requests/"+request.getId()+"/contract-context").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(); }
    @Test void newContractContextUsesVerifiedCitizenWithoutRequiringManualIdentity()throws Exception{
        var verified=com.ancu.proptech.support.VerifiedIdentityFixtures.bind(verifiedIdentities,owner);
        String context=context();assertEquals(verified.getDocumentNumber(),JsonPath.read(context,"$.snapshot.owner.documentNumber"));assertEquals("VERIFIED",JsonPath.read(context,"$.snapshot.owner.identityVerificationStatus"));
        assertNull(JsonPath.read(context,"$.snapshot.owner.documentIssueDate"));assertEquals(verified.getLegalName(),JsonPath.read(context,"$.snapshot.owner.fullName"));
    }
    @Autowired PropertyExternalImportRepository imports;
    @Test void completeVerifiedPartyDetailsReachNewDraftButExistingSnapshotStaysFrozen()throws Exception {
        var verified=com.ancu.proptech.support.VerifiedIdentityFixtures.bind(verifiedIdentities,customer);
        customer.setPhone("+84999000002");accounts.saveAndFlush(customer);
        verified.setDocumentIssueDate(LocalDate.of(2021,6,16));
        verified.setDocumentIssuePlace("Cục Cảnh sát quản lý hành chính về trật tự xã hội");
        verified.setPermanentAddress("54 Hoàng Diệu, phường Phước Ninh, quận Hải Châu, thành phố Đà Nẵng");verifiedIdentities.saveAndFlush(verified);
        String saved=create();assertEquals("+84999000002",JsonPath.read(saved,"$.snapshot.customer.phone"));
        assertEquals("2021-06-16",JsonPath.read(saved,"$.snapshot.customer.documentIssueDate"));
        assertEquals(verified.getDocumentIssuePlace(),JsonPath.read(saved,"$.snapshot.customer.documentIssuePlace"));
        assertEquals(verified.getPermanentAddress(),JsonPath.read(saved,"$.snapshot.customer.permanentAddress"));
        customer.setPhone("+84999000999");accounts.saveAndFlush(customer);verified.setDocumentIssuePlace("Một cơ quan khác");verifiedIdentities.saveAndFlush(verified);
        mvc.perform(get("/api/v1/contracts/"+id(saved)).header("Authorization",customerToken)).andExpect(status().isOk())
            .andExpect(jsonPath("$.snapshot.customer.phone").value("+84999000002"))
            .andExpect(jsonPath("$.snapshot.customer.documentIssuePlace").value("Cục Cảnh sát quản lý hành chính về trật tự xã hội"));
    }
    @Autowired tools.jackson.databind.ObjectMapper json;
    private PropertyExternalImport sourceEvidence() {
        var identity=com.ancu.proptech.support.VerifiedIdentityFixtures.bind(verifiedIdentities,owner);
        var e=new PropertyExternalImport();e.setPropertyId(request.getApartment().getProperty().getId());e.setIssuer(identity.getIssuer());e.setSubject(identity.getSubject());e.setExternalAssetId("SOURCE-"+owner.getId());e.setSource("AUTH0_VNEID_SIMULATION");e.setSourceVersion("a".repeat(64));e.setImportedAt(Instant.now());
        e.setSourceSnapshot(json.writeValueAsString(new com.ancu.proptech.dto.property.VneidAsset(e.getExternalAssetId(),"Nhà nguồn","Địa chỉ nguồn","SINGLE_UNIT","CT 482716","2020-06-15","Đà Nẵng",List.of(),"Quyền sở hữu riêng")));return imports.saveAndFlush(e);
    }
    @Test void sourceCertificateAndReceivingAccountReachFrozenDraftWithoutFakeAdminReview()throws Exception {
        var e=sourceEvidence();String before=context();assertEquals("CT 482716",JsonPath.read(before,"$.snapshot.asset.certificateNumber"));assertEquals("OWNERSHIP",JsonPath.read(before,"$.snapshot.asset.exploitationRight"));assertNull(JsonPath.read(before,"$.snapshot.asset.approvedDossierId"));
        String bankBody=json.writeValueAsString(Map.of("bank","Ngân hàng thử","accountNumber","12345678","accountHolderName",verifiedIdentities.findById(owner.getId()).orElseThrow().getLegalName(),"version",e.getVersion()));
        mvc.perform(put("/api/v1/owner/properties/"+e.getPropertyId()+"/receiving-account").header("Authorization",otherToken).contentType("application/json").content(bankBody)).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/owner/properties/"+e.getPropertyId()+"/receiving-account").header("Authorization",token).contentType("application/json").content(bankBody.replace("12345678","87654321").replace("Ngân hàng thử","Ngân hàng đúng"))).andExpect(status().isNoContent());
        create(token,body(before)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOURCE_CHANGED"));
        String saved=create();assertEquals("87654321",JsonPath.read(saved,"$.snapshot.receivingAccount.accountNumber"));assertEquals("AUTH0_VNEID_SIMULATION",JsonPath.read(saved,"$.snapshot.evidence.source"));assertEquals("2020-06-15",JsonPath.read(saved,"$.snapshot.asset.certificateIssueDate"));
        e.setBank("Tên ngân hàng thay đổi");imports.flush();update(id(saved),0,terms()).andExpect(status().isOk()).andExpect(jsonPath("$.snapshot.receivingAccount.bank").value("Ngân hàng đúng"));assertTrue(dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(e.getPropertyId()).isEmpty());
    }
    @Test void bankHolderAndVersionAreValidatedWithoutPublishingPrivateAccount()throws Exception {
        var e=sourceEvidence();String url="/api/v1/owner/properties/"+e.getPropertyId()+"/receiving-account";
        mvc.perform(put(url).header("Authorization",token).contentType("application/json").content("{\"bank\":\"Bank\",\"accountNumber\":\"12345678\",\"accountHolderName\":\"Khong trung ten\",\"version\":0}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("ACCOUNT_HOLDER_MISMATCH"));
        mvc.perform(put(url).header("Authorization",token).contentType("application/json").content("{\"bank\":\"Bank\",\"accountNumber\":\"12345678\",\"accountHolderName\":\"Khong trung ten\",\"version\":99}")).andExpect(status().isConflict());
    }
    @Test void cannotCreateContractBeyondApprovedRights()throws Exception{
        var p=request.getApartment().getProperty();p.setRightType(PropertyDossier.RightType.AUTHORIZATION);p.setRightsValidFrom(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1));p.setRightsValidUntil(today().plusYears(1).minusDays(1));properties.flush();
        create(token,body(context())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_EXCEEDS_PROPERTY_RIGHTS"));
    }
    @Test void contractEndingOnRightsEndIsAllowedButUpdateBeyondItIsRejected()throws Exception{
        var p=request.getApartment().getProperty();p.setRightType(PropertyDossier.RightType.AUTHORIZATION);p.setRightsValidFrom(LocalDate.parse((String)JsonPath.read("{"+terms()+"}","$.startDate")).minusDays(1));p.setRightsValidUntil(today().plusYears(1));properties.flush();
        String saved=create(token,body(context())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        update(id(saved),0,terms().replace(today().plusYears(1).toString(),today().plusYears(1).plusDays(1).toString())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_EXCEEDS_PROPERTY_RIGHTS"));
    }
    @Test void draftBookingLimitIncludesDay90ButRejectsDay91OnCreateAndUpdate()throws Exception {
        var input=body(context()).replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().plusDays(91)+"\"");
        create(token,input)
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_TOO_FAR"));
        String saved=create(token,body(context()).replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().plusDays(90)+"\"")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        update(id(saved),0,terms().replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().plusDays(91)+"\""))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_TOO_FAR"));
        assertEquals(today().plusDays(90).toString(),JsonPath.read(readContract(id(saved)),"$.startDate"));
    }
    @Test void expiredUnsignedDraftCanBeCorrectedWithoutLosingOtherEdits()throws Exception {
        String saved=create();var c=contracts.findById(Long.parseLong(id(saved))).orElseThrow();c.setStartDate(today().minusDays(1));contracts.saveAndFlush(c);
        update(id(saved),0,terms().replace("\"deposit\":\"10000000\"","\"deposit\":\"9000000\""))
            .andExpect(status().isOk()).andExpect(jsonPath("$.startDate").value(today().toString())).andExpect(jsonPath("$.deposit").value("9000000"));
    }
    @Test void rentalTermCountsBothEndpointsAndRejects29DaysOnCreateAndUpdate()throws Exception {
        String shortTerms=terms().replace(today().plusYears(1).toString(),today().plusDays(28).toString());
        create(token,body(context()).replace(today().plusYears(1).toString(),today().plusDays(28).toString()))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_TERM_TOO_SHORT"));
        String saved=create(token,body(context()).replace(today().plusYears(1).toString(),today().plusDays(29).toString()))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.oneMonthRentPackage").value(false)).andReturn().getResponse().getContentAsString();
        update(id(saved),0,shortTerms).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_TERM_TOO_SHORT"));
        update(id(saved),0,terms().replace(today().plusYears(1).toString(),today().plusDays(29).toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.oneMonthRentPackage").value(false));
    }
    private String createOneMonth(LocalDate start)throws Exception {
        String input=body(context()).replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+start+"\"")
            .replace(today().plusYears(1).toString(),start.plusDays(29).toString());
        String result=create(token,input).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var c=contracts.findById(Long.valueOf(id(result))).orElseThrow();c.setCalendarRentBilling(false);c.setOneMonthRentPackage(true);contracts.saveAndFlush(c);return readContract(id(result));
    }
    private int rentCount(String id){return jdbc.queryForObject("SELECT COUNT(*) FROM rental_invoices WHERE contract_id=? AND kind='RENT' AND status<>'CANCELLED'",Integer.class,Long.valueOf(id));}
    @Test void oneMonthActivationSendsExactlyOneFullRentInvoiceAndNotification()throws Exception {
        String saved=createOneMonth(today());String hash=JsonPath.read(saved,"$.signing.contentHash");
        sign(saved,token,hash,signature(),true).andExpect(status().isOk());assertEquals(0,rentCount(id(saved)));
        sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        var row=jdbc.queryForMap("SELECT * FROM rental_invoices WHERE contract_id=? AND kind='RENT'",Long.valueOf(id(saved)));
        assertEquals("SENT",row.get("status"));assertEquals(today(),((java.sql.Date)row.get("coverage_start")).toLocalDate());
        assertEquals(today().plusDays(29),((java.sql.Date)row.get("coverage_end")).toLocalDate());assertEquals(today(),((java.sql.Date)row.get("due_date")).toLocalDate());
        assertEquals(0,new BigDecimal("6200000.50").compareTo((BigDecimal)row.get("total_amount")));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM invoice_notifications WHERE invoice_id=?",Integer.class,row.get("id")));
        packageInvoices.prepareInitialRent(Long.valueOf(id(saved)));packageInvoices.prepareScheduledRent(Long.valueOf(id(saved)));initialActivation.activate(Long.valueOf(id(saved)));
        assertEquals(1,rentCount(id(saved)));
        mvc.perform(get("/api/v1/owner/contracts/"+id(saved)+"/rent-billing-context").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.coverageStart").isEmpty());
        mvc.perform(get("/api/v1/invoices/"+row.get("id")).header("Authorization",customerToken)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/invoices/"+row.get("id")).header("Authorization",otherToken)).andExpect(status().isNotFound());
    }
    @Test void futureOneMonthInvoiceWaitsForActivationAndCatchesUpAfterStart()throws Exception {
        LocalDate start=today().plusDays(2);String saved=createOneMonth(start);String hash=JsonPath.read(saved,"$.signing.contentHash");
        sign(saved,token,hash,signature(),true).andExpect(status().isOk());sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT"));
        packageInvoices.prepareInitialRent(Long.valueOf(id(saved)));assertEquals(0,rentCount(id(saved)));
        org.mockito.Mockito.doReturn(start.plusDays(1)).when(signingDates).today();initialActivation.activate(Long.valueOf(id(saved)));
        assertEquals(1,rentCount(id(saved)));assertEquals(start,jdbc.queryForObject("SELECT due_date FROM rental_invoices WHERE contract_id=? AND kind='RENT'",java.sql.Date.class,Long.valueOf(id(saved))).toLocalDate());
        packageInvoices.prepareScheduledRent(Long.valueOf(id(saved)));assertEquals(1,rentCount(id(saved)));
    }
    @Test void oneMonthRenewalBillsNewLeaseWithoutChangingPreviousInvoiceHistory()throws Exception {
        String old=expiredContract(),oldId=id(old);String input=renewalInput(oldId).replace(YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusMonths(11).atEndOfMonth().toString(),today().plusDays(29).toString());
        String next=mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/renewals").header("Authorization",token).contentType("application/json").content(input)).andExpect(status().isCreated()).andExpect(jsonPath("$.oneMonthRentPackage").value(false)).andReturn().getResponse().getContentAsString();
        String hash=JsonPath.read(next,"$.signing.contentHash");sign(next,token,hash,signature(),true).andExpect(status().isOk());assertEquals(0,rentCount(id(next)));
        sign(next,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        assertEquals(1,rentCount(id(next)));assertEquals("ENDED",JsonPath.read(readContract(oldId),"$.status"));
    }
    @Test void legacyOneMonthLeaseDoesNotAcquireNewPackageOrAutomaticCharge()throws Exception {
        String saved=createOneMonth(today());var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();c.setOneMonthRentPackage(false);contracts.saveAndFlush(c);saved=readContract(id(saved));
        String hash=JsonPath.read(saved,"$.signing.contentHash");sign(saved,token,hash,signature(),true).andExpect(status().isOk());sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk());
        packageInvoices.prepareInitialRent(c.getId());assertEquals(0,rentCount(id(saved)));assertFalse(c.isOneMonthRentPackage());
    }
    @Test void packageCycleAndServerOwnedBillingPolicyCannotBeForged()throws Exception {
        String input=body(context()).replace(today().plusYears(1).toString(),today().plusDays(29).toString());
        create(token,input.substring(0,input.length()-1)+",\"rentCycleMonths\":3}")
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("ONE_MONTH_RENT_CYCLE_REQUIRED"));
        create(token,input.substring(0,input.length()-1)+",\"oneMonthRentPackage\":false}").andExpect(status().isBadRequest());
    }
    @org.junit.jupiter.params.ParameterizedTest @org.junit.jupiter.params.provider.ValueSource(booleans={false,true})
    void legacyInvalidDatesCannotBypassPolicyAtOtpOrDirectSignature(boolean tooFar)throws Exception {
        String saved=create();var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();
        if(tooFar)c.setStartDate(today().plusDays(91));else c.setEndDate(today().plusDays(28));
        contracts.saveAndFlush(c);saved=readContract(id(saved));String hash=JsonPath.read(saved,"$.signing.contentHash");
        String code=tooFar?"CONTRACT_START_DATE_TOO_FAR":"CONTRACT_TERM_TOO_SHORT";
        sign(saved,token,hash,signature(),true).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(code));
        org.mockito.Mockito.doReturn(false).when(signingOtpPolicy).required();
        String body="{\"version\":0,\"contentHash\":\""+hash+"\",\"signature\":\""+signature()+"\",\"consent\":true}";
        mvc.perform(post("/api/v1/contracts/"+id(saved)+"/signatures").header("Authorization",token).contentType("application/json").content(body))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(code));
        assertEquals(0,rentCount(id(saved)));
    }
    private static LocalDate today(){return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));}
    @Test void creatingContractWithYesterdayStartIsRejectedWithoutPersisting()throws Exception{
        String input=body(context()).replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().minusDays(1)+"\"");
        create(token,input).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_IN_PAST"));
        assertTrue(contracts.findByApartmentId(request.getApartment().getId()).isEmpty());
        assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,request.getApartment().getAvailability());
    }
    @Test void editingContractCannotBackdateAndDoesNotChangeSavedDates()throws Exception{
        String saved=create();
        update(id(saved),0,terms().replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().minusDays(1)+"\""))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_IN_PAST"));
        assertEquals(today().toString(),JsonPath.read(readContract(id(saved)),"$.startDate"));
    }
    @Test void renewalCannotStartYesterdayEvenAfterOriginalContractExpired()throws Exception{
        String old=expiredContract();String previousId=id(old);
        String input=renewalInput(previousId).replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().minusDays(1)+"\"");
        mvc.perform(post("/api/v1/owner/contracts/"+previousId+"/renewals").header("Authorization",token).contentType("application/json").content(input))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_IN_PAST"));
        assertEquals(1,contracts.findByApartmentId(request.getApartment().getId()).size());
        assertEquals("ACTIVE",JsonPath.read(readContract(previousId),"$.status"));
    }
    @Test void todayAndFutureStartRemainAllowed()throws Exception{
        String saved=create();
        update(id(saved),0,terms().replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().plusDays(1)+"\""))
            .andExpect(status().isOk()).andExpect(jsonPath("$.startDate").value(today().plusDays(1).toString()));
    }
    private String terms() { return """
        "startDate":"%s","endDate":"%s","monthlyRent":"6200000.50","electricityUnitPrice":"3500","waterUnitPrice":"15000","deposit":"10000000","paymentDay":5,"paymentMethod":"Chuyển khoản","usagePurpose":"Để ở","clauses":[{"title":"Điều khoản riêng","body":"Không hút thuốc trong căn hộ."}]
        """.formatted(today(),today().plusYears(1)).strip(); }
    private String body(String ctx) { return "{\"requestVersion\":"+request.getVersion()+",\"sourceVersion\":\""+JsonPath.read(ctx,"$.sourceVersion")+"\","+terms()+"}"; }
    private ResultActions create(String authHeader,String input) throws Exception { return mvc.perform(post("/api/v1/owner/rental-requests/"+request.getId()+"/contract").header("Authorization",authHeader).contentType("application/json").content(input)); }
    private String create() throws Exception { return create(token,body(context())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(); }
    private String id(String value) { return JsonPath.read(value,"$.id"); }
    private String readContract(String contractId) throws Exception {
        return mvc.perform(get("/api/v1/contracts/"+contractId).header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }
    private String expiredContract() throws Exception {
        String saved=create();var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();
        var month=java.time.YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        c.setStartDate(month.minusMonths(1).atDay(1));c.setEndDate(month.atDay(1).minusDays(1));c.setStatus(RentalContract.Status.ACTIVE);
        c.setElectricityBaseline(new BigDecimal("200"));c.setWaterBaseline(new BigDecimal("50"));c.setBaselineDate(c.getStartDate());contracts.saveAndFlush(c);
        c.getApartment().setAvailability(Apartment.Availability.OCCUPIED);apartments.saveAndFlush(c.getApartment());
        var d=drafts.findByContractId(c.getId()).orElseThrow();d.setOwnerSignature(Base64.getDecoder().decode(signature().substring(22)));d.setCustomerSignature(d.getOwnerSignature());
        d.setOwnerSignedAt(Instant.now().minusSeconds(3600));d.setCustomerSignedAt(Instant.now().minusSeconds(3500));drafts.saveAndFlush(d);
        return readContract(c.getId().toString());
    }
    private String renewalInput(String previousId) throws Exception {
        if(renewalRequests.findByContractId(Long.valueOf(previousId)).isEmpty())acceptRenewal(previousId);
        var ctx=mvc.perform(get("/api/v1/owner/contracts/"+previousId+"/renewal-context").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var month=java.time.YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        return "{\"requestVersion\":"+JsonPath.read(ctx,"$.requestVersion")+",\"sourceVersion\":\""+JsonPath.read(ctx,"$.sourceVersion")+"\","+
            terms().replace(today().plusYears(1).toString(),month.plusMonths(11).atEndOfMonth().toString())+"}";
    }
    private String handoverInput(String contract) {
        return "{\"version\":"+JsonPath.read(contract,"$.lifecycle.version")+",\"returnDate\":\""+LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))+"\",\"electricityReading\":\"215\",\"waterReading\":\"55\",\"keysReturned\":true,\"conditionNotes\":\"Phòng đã kiểm tra, đủ chìa khóa.\",\"deductionAmount\":\"100000\",\"consent\":true}";
    }
    @Test void renewalCreatesNewDocumentAndEndsOldOnlyAfterBothNewSignatures() throws Exception {
        String old=expiredContract();String oldId=id(old);String input=renewalInput(oldId);
        mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/renewals").header("Authorization",customerToken).contentType("application/json").content(input)).andExpect(status().isForbidden());
        String next=mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/renewals").header("Authorization",token).contentType("application/json").content(input))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.lifecycle.previousContractId").value(oldId))
            .andExpect(jsonPath("$.signing.state").value("UNSIGNED")).andReturn().getResponse().getContentAsString();
        assertNotEquals(oldId,id(next));assertEquals("ACTIVE",JsonPath.read(readContract(oldId),"$.status"));
        String hash=JsonPath.read(next,"$.signing.contentHash");
        sign(next,token,hash,signature(),true).andExpect(status().isOk());assertEquals("ACTIVE",JsonPath.read(readContract(oldId),"$.status"));
        sign(next,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        String ended=readContract(oldId);assertEquals("ENDED",JsonPath.read(ended,"$.status"));assertEquals("RENEWED",JsonPath.read(ended,"$.lifecycle.endReason"));
        assertEquals(JsonPath.<String>read(old,"$.signing.ownerSignature"),JsonPath.<String>read(ended,"$.signing.ownerSignature"));
        assertEquals(JsonPath.<String>read(old,"$.signing.contentHash"),JsonPath.<String>read(ended,"$.signing.contentHash"));
        assertEquals(Apartment.Availability.OCCUPIED,request.getApartment().getAvailability());
        mvc.perform(get("/api/v1/me/tenancies").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }
    @Test void renewalAndHandoverCannotRunTogetherAndCancelledRenewalPreservesHistory() throws Exception {
        String old=expiredContract();String oldId=id(old);String input=renewalInput(oldId);
        String next=mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/renewals").header("Authorization",token).contentType("application/json").content(input)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/renewals").header("Authorization",token).contentType("application/json").content(input)).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/handover").header("Authorization",token).contentType("application/json").content(handoverInput(readContract(oldId)))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OPEN_RENEWAL"));
        mvc.perform(post("/api/v1/owner/contracts/"+id(next)+"/cancel-renewal").header("Authorization",token).contentType("application/json").content("{\"version\":"+JsonPath.read(next,"$.lifecycle.version")+",\"consent\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.lifecycle.endReason").value("RENEWAL_CANCELLED"));
        assertEquals("ACTIVE",JsonPath.read(readContract(oldId),"$.status"));
        mvc.perform(get("/api/v1/owner/contracts/"+oldId+"/renewal-context").header("Authorization",token)).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/handover").header("Authorization",token).contentType("application/json").content(handoverInput(readContract(oldId)))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("HANDOVER_SIGNATURES_REQUIRED"));
    }
    @Test void legacyHandoverEndpointsCannotEndContractWithoutPdfSignatures() throws Exception {
        String old=expiredContract();String oldId=id(old);
        mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/handover").header("Authorization",token).contentType("application/json").content(handoverInput(old)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("HANDOVER_SIGNATURES_REQUIRED"));
        assertEquals("ACTIVE",JsonPath.read(readContract(oldId),"$.status"));
        assertEquals(Apartment.Availability.OCCUPIED,request.getApartment().getAvailability());
        assertEquals(0,handovers.findAll().stream().filter(h->h.getContract().getId().toString().equals(oldId)).count());
    }
    @Test void oldPendingHandoverRemainsReadableAndCancellableButCannotConfirmWithoutSignatures() throws Exception {
        String old=expiredContract();String oldId=id(old);var c=contracts.findById(Long.valueOf(oldId)).orElseThrow();
        var h=new com.ancu.proptech.model.contract.ContractHandover();h.setContract(c);h.setStatus(com.ancu.proptech.model.contract.ContractHandover.Status.PENDING);
        h.setReturnDate(c.getEndDate());h.setElectricityReading(new BigDecimal("215"));h.setWaterReading(new BigDecimal("55"));h.setElectricityStartReading(new BigDecimal("200"));h.setWaterStartReading(new BigDecimal("50"));h.setKeysReturned(true);h.setConditionNotes("Old record");h.setDepositAmount(new BigDecimal("10000000"));h.setDeductionAmount(BigDecimal.ZERO);h.setUtilityAmount(new BigDecimal("127500"));h.setRefundAmount(new BigDecimal("9872500"));h.setExtraAmountDue(BigDecimal.ZERO);h.setOwnerConfirmedAt(Instant.now());handovers.saveAndFlush(h);
        mvc.perform(post("/api/v1/contracts/"+oldId+"/handover/confirm").header("Authorization",customerToken).contentType("application/json").content("{\"version\":"+h.getVersion()+",\"consent\":true}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("HANDOVER_SIGNATURES_REQUIRED"));
        assertEquals("ACTIVE",JsonPath.read(readContract(oldId),"$.status"));
        mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/handover/cancel").header("Authorization",token).contentType("application/json").content("{\"version\":"+h.getVersion()+",\"consent\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.lifecycle.handover.status").value("CANCELLED"));
    }
    @Test void unexpiredContractCannotRenewOrHandoverAndOtherOwnersCannotReadRenewalContext() throws Exception {
        String saved=create();var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();c.setStatus(RentalContract.Status.ACTIVE);contracts.saveAndFlush(c);
        mvc.perform(get("/api/v1/owner/contracts/"+id(saved)+"/renewal-context").header("Authorization",token)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RENEWAL_REQUEST_NOT_ACCEPTED"));
        mvc.perform(get("/api/v1/owner/contracts/"+id(saved)+"/renewal-context").header("Authorization",otherToken)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/owner/contracts/"+id(saved)+"/handover").header("Authorization",token).contentType("application/json").content(handoverInput(readContract(id(saved))))).andExpect(status().isConflict());
    }
    private ResultActions askRenewal(String id,String account,String message)throws Exception {
        return mvc.perform(post("/api/v1/contracts/"+id+"/renewal-request").header("Authorization",account).contentType("application/json").content("{\"version\":"+JsonPath.read(readContract(id),"$.lifecycle.version")+",\"consent\":true,\"message\":\""+message+"\"}"));
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints={11,10,1,0,-1})
    void renewalRequestStartsTenDaysBeforeExpiryUsingServerDate(int daysUntilEnd) throws Exception {
        String saved=create();String contractId=id(saved);
        var contract=contracts.findById(Long.valueOf(contractId)).orElseThrow();
        var today=java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        contract.setStatus(RentalContract.Status.ACTIVE);contract.setStartDate(today.minusMonths(1));
        contract.setEndDate(today.plusDays(daysUntilEnd));contracts.saveAndFlush(contract);
        String current=readContract(contractId);
        assertEquals(contract.getEndDate().minusDays(10).toString(),JsonPath.read(current,"$.lifecycle.renewalRequestOpensOn"));
        assertEquals(Boolean.valueOf(daysUntilEnd<=10),JsonPath.<Boolean>read(current,"$.lifecycle.renewalRequestAvailable"));
        var response=askRenewal(contractId,customerToken,"Muốn thuê tiếp");
        if(daysUntilEnd>10){
            response.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RENEWAL_REQUEST_TOO_EARLY"));
            assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM contract_renewal_requests WHERE contract_id=?",Integer.class,Long.valueOf(contractId)));
        }else response.andExpect(status().isOk()).andExpect(jsonPath("$.lifecycle.renewalRequest.status").value("PENDING"));
    }
    private void acceptRenewal(String id)throws Exception {
        String requested=askRenewal(id,customerToken,"Muốn thuê tiếp").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/v1/owner/contracts/"+id+"/renewal-request/decision").header("Authorization",token).contentType("application/json")
            .content("{\"version\":"+JsonPath.read(requested,"$.lifecycle.renewalRequest.version")+",\"decision\":\"ACCEPT\"}")).andExpect(status().isOk());
    }
    @Test void renewalRequestIsExactTenantVersionedIdempotentAndBlocksHandover()throws Exception {
        String old=expiredContract();String id=id(old);
        askRenewal(id,otherToken,"forged").andExpect(status().isNotFound());
        askRenewal(id,token,"forged").andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/contracts/"+id+"/renewal-request").header("Authorization",customerToken).contentType("application/json").content("{\"consent\":true}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/contracts/"+id+"/renewal-request").header("Authorization",customerToken).contentType("application/json").content("{\"version\":99,\"consent\":true}")).andExpect(status().isConflict());
        askRenewal(id,customerToken,"Muốn thuê tiếp").andExpect(status().isOk()).andExpect(jsonPath("$.lifecycle.renewalRequest.status").value("PENDING")).andExpect(jsonPath("$.lifecycle.handoverAvailable").value(false));
        askRenewal(id,customerToken,"Muốn thuê tiếp").andExpect(status().isOk());
        assertEquals(1,jdbc.queryForObject("select count(*) from contract_renewal_requests where contract_id=?",Integer.class,Long.valueOf(id)));
        mvc.perform(get("/api/v1/owner/contracts/"+id+"/renewal-context").header("Authorization",token)).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/owner/contracts/"+id+"/handover").header("Authorization",token).contentType("application/json").content(handoverInput(old))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OPEN_RENEWAL_REQUEST"));
        String url="/api/v1/owner/contracts/"+id+"/renewal-request/decision";
        mvc.perform(post(url).header("Authorization",otherToken).contentType("application/json").content("{\"version\":0,\"decision\":\"REJECT\",\"reason\":\"Không cho thuê tiếp\"}")).andExpect(status().isNotFound());
        mvc.perform(post(url).header("Authorization",token).contentType("application/json").content("{\"version\":0,\"decision\":\"REJECT\"}")).andExpect(status().isBadRequest());
        mvc.perform(post(url).header("Authorization",token).contentType("application/json").content("{\"version\":0,\"decision\":\"REJECT\",\"reason\":\"Không cho thuê tiếp\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.lifecycle.handoverAvailable").value(true));
        mvc.perform(post(url).header("Authorization",token).contentType("application/json").content("{\"version\":0,\"decision\":\"ACCEPT\"}")).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/me/notifications").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.title=='Yêu cầu thuê tiếp đã được xử lý')]").isNotEmpty());
    }
    @Test void futureRenewalSignaturesDoNotEndCurrentTermOrActivateEarly()throws Exception {
        String old=expiredContract();String oldId=id(old);var c=contracts.findById(Long.valueOf(oldId)).orElseThrow();
        var today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));c.setEndDate(today.plusDays(10));contracts.saveAndFlush(c);
        acceptRenewal(oldId);
        String input=renewalInput(oldId).replace("\"startDate\":\""+today+"\"","\"startDate\":\""+today.plusDays(11)+"\"");
        String next=mvc.perform(post("/api/v1/owner/contracts/"+oldId+"/renewals").header("Authorization",token).contentType("application/json").content(input)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String hash=JsonPath.read(next,"$.signing.contentHash");sign(next,token,hash,signature(),true).andExpect(status().isOk());
        sign(next,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT")).andExpect(jsonPath("$.signing.state").value("SIGNED"));
        assertEquals("ACTIVE",JsonPath.read(readContract(oldId),"$.status"));
        renewalActivation.activate(Long.valueOf(id(next)));assertEquals("DRAFT",JsonPath.read(readContract(id(next)),"$.status"));
        mvc.perform(post("/api/v1/owner/contracts/"+id(next)+"/cancel-renewal").header("Authorization",token).contentType("application/json").content("{\"version\":0,\"consent\":true}")).andExpect(status().isConflict());
    }
    @Test void expiryRemindersArePersistentScopedAndDeduplicatedAtTwentyAndTenDays()throws Exception {
        String old=expiredContract();long id=Long.parseLong(id(old));var end=contracts.findById(id).orElseThrow().getEndDate();
        expiryNotices.generate(end.minusDays(21));assertEquals(0,jdbc.queryForObject("select count(*) from contract_expiry_notices where contract_id=?",Integer.class,id));
        expiryNotices.generate(end.minusDays(20));expiryNotices.generate(end.minusDays(20));
        assertEquals(2,jdbc.queryForObject("select count(*) from contract_expiry_notices where contract_id=?",Integer.class,id));
        expiryNotices.generate(end.minusDays(10));expiryNotices.generate(end.minusDays(1));
        assertEquals(4,jdbc.queryForObject("select count(*) from contract_expiry_notices where contract_id=?",Integer.class,id));
        mvc.perform(get("/api/v1/me/notifications").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.title=='Hợp đồng sắp hết hạn')]").isNotEmpty());
        String customerFeed=mvc.perform(get("/api/v1/me/notifications").header("Authorization",customerToken)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(customerFeed.contains("/my/rental-requests?tab=contracts&contractId="+id));
        String ownerFeed=mvc.perform(get("/api/v1/me/notifications").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(ownerFeed.contains("/app?tab=contracts&propertyId="+request.getApartment().getProperty().getId()+"&contractId="+id));
        assertEquals(0,jdbc.queryForObject("select count(*) from contract_expiry_notices where contract_id=? and recipient_id=?",Integer.class,id,other.getId()));
        assertEquals("ACTIVE",JsonPath.read(readContract(Long.toString(id)),"$.status"));
    }
    @Test void acceptedRequestCanBeCancelledBeforeDraftButNeverSilentlyDiscarded()throws Exception {
        String old=expiredContract();String id=id(old);acceptRenewal(id);
        mvc.perform(post("/api/v1/owner/contracts/"+id+"/handover").header("Authorization",token).contentType("application/json").content(handoverInput(old))).andExpect(status().isConflict());
        String url="/api/v1/owner/contracts/"+id+"/renewal-request/cancel";
        mvc.perform(post(url).header("Authorization",otherToken).contentType("application/json").content("{\"version\":1,\"consent\":true}")).andExpect(status().isNotFound());
        mvc.perform(post(url).header("Authorization",token).contentType("application/json").content("{\"version\":0,\"consent\":true}")).andExpect(status().isConflict());
        mvc.perform(post(url).header("Authorization",token).contentType("application/json").content("{\"version\":1,\"consent\":true}")).andExpect(status().isOk()).andExpect(jsonPath("$.lifecycle.renewalRequest.status").value("CANCELLED")).andExpect(jsonPath("$.lifecycle.handoverAvailable").value(true));
        mvc.perform(get("/api/v1/me/notifications").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.title=='Ký tiếp đã được hủy')]").isNotEmpty());
    }
    @Test void tenantRenewalRequestStillRequiresCurrentVerification()throws Exception {
        String old=expiredContract();customer.setEmailVerified(false);customer.setContactVerified(false);accounts.saveAndFlush(customer);
        askRenewal(id(old),customerToken,"Muốn thuê tiếp").andExpect(status().isForbidden());
        assertTrue(renewalRequests.findByContractId(Long.valueOf(id(old))).isEmpty());
    }
    @Test void renewalInboxScopesOwnerPropertyStatusAndCountsBeforePagination()throws Exception {
        String old=expiredContract();String id=id(old);askRenewal(id,customerToken,"Muốn thuê tiếp").andExpect(status().isOk());
        String url="/api/v1/owner/renewal-requests";
        mvc.perform(get("/api/v1/me/notifications").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.title=='Khách yêu cầu thuê tiếp')].url").value(org.hamcrest.Matchers.hasItem("/app?tab=rental_requests&requestType=renewal&propertyId="+request.getApartment().getProperty().getId())));
        mvc.perform(get(url).header("Authorization",token).param("status","PENDING").param("size","1")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].contractId").value(id)).andExpect(jsonPath("$.items[0].customerEmail").value(customer.getEmail()));
        mvc.perform(get(url).header("Authorization",otherToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(url).header("Authorization",customerToken)).andExpect(status().isForbidden());
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        mvc.perform(get(url).header("Authorization",token).param("propertyId","999999999")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(url).header("Authorization",token).param("status","REJECTED")).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get(url).header("Authorization",token).param("status","INVALID")).andExpect(status().isBadRequest());
        mvc.perform(get(url).header("Authorization",token).param("page","-1")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/owner/contracts/"+id+"/renewal-request/decision").header("Authorization",token).contentType("application/json").content("{\"version\":0,\"decision\":\"ACCEPT\"}")).andExpect(status().isOk());
        mvc.perform(get(url).header("Authorization",token).param("status","PENDING")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        String next=mvc.perform(post("/api/v1/owner/contracts/"+id+"/renewals").header("Authorization",token).contentType("application/json").content(renewalInput(id))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(get(url).header("Authorization",token).param("status","ACCEPTED").param("propertyId",request.getApartment().getProperty().getId().toString())).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].nextContractId").value(id(next)));
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization",token).param("status","ACCEPTED").param("contractCompleted","false")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization",token).param("status","ACCEPTED")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }
    @Test void ordinaryInboxSeparatesUnsignedAndSignedAcceptedRequestsWithoutChangingState()throws Exception {
        String saved=create();String id=id(saved);
        String url="/api/v1/owner/rental-requests";
        mvc.perform(get(url).header("Authorization",token).param("status","ACCEPTED").param("contractCompleted","false").param("size","1")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].contractCompleted").value(false));
        var d=drafts.findByContractId(Long.valueOf(id)).orElseThrow();d.setOwnerSignedAt(Instant.now());drafts.saveAndFlush(d);
        mvc.perform(get(url).header("Authorization",token).param("status","ACCEPTED").param("contractCompleted","true")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        d.setCustomerSignedAt(Instant.now());drafts.saveAndFlush(d);
        mvc.perform(get(url).header("Authorization",token).param("status","ACCEPTED").param("contractCompleted","true").param("size","1")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].contractCompleted").value(true));
        mvc.perform(get(url).header("Authorization",token).param("status","ACCEPTED").param("contractCompleted","false")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(url).header("Authorization",token).param("status","PENDING").param("contractCompleted","true")).andExpect(status().isBadRequest());
        assertEquals(RentalRequest.Status.ACCEPTED,request.getStatus());
    }
    private String signature() throws Exception {
        var image=new java.awt.image.BufferedImage(900,280,java.awt.image.BufferedImage.TYPE_INT_ARGB);
        var pen=image.createGraphics();pen.setColor(java.awt.Color.BLACK);pen.setStroke(new java.awt.BasicStroke(4));
        pen.drawPolyline(new int[]{70,160,240,170,400,490,570,700},new int[]{180,70,170,210,80,180,100,170},8);pen.dispose();
        var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",bytes);
        return "data:image/png;base64,"+Base64.getEncoder().encodeToString(bytes.toByteArray());
    }
    private ResultActions sign(String contract,String actor,String hash,String image,boolean consent) throws Exception {
        expireOtpCooldown();
        String body="{\"version\":"+JsonPath.read(contract,"$.version")+",\"contentHash\":\""+hash+"\",\"signature\":\""+image+"\",\"consent\":"+consent+"}";
        var issued=mvc.perform(post("/api/v1/contracts/"+id(contract)+"/signature-otp").header("Authorization",actor).contentType("application/json").content(body));
        var result=issued.andReturn();if(result.getResponse().getStatus()!=200)return issued;
        String challenge=JsonPath.read(result.getResponse().getContentAsString(),"$.challengeId");
        return mvc.perform(post("/api/v1/contracts/"+id(contract)+"/signatures").header("Authorization",actor)
            .contentType("application/json").content(body.substring(0,body.length()-1)+",\"challengeId\":\""+challenge+"\",\"code\":\""+otpCode+"\"}"));
    }
    @Test void pdfIsRealPrivatePaginatedVietnameseAndHasTwoSignatureAreas() throws Exception {
        String contract=create();String contractId=id(contract);
        byte[] bytes=mvc.perform(get("/api/v1/contracts/"+contractId+"/pdf").header("Authorization",token))
            .andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
            .andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsByteArray();
        assertEquals("%PDF-",new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII));
        try(var pdf=org.apache.pdfbox.Loader.loadPDF(bytes)) {
            String text=new org.apache.pdfbox.text.PDFTextStripper().getText(pdf);
            assertTrue(text.contains("HỢP ĐỒNG THUÊ CĂN HỘ"));assertTrue(text.contains("Điều khoản riêng"));
            assertTrue(text.contains("BÊN CHO THUÊ (BÊN A)"));assertTrue(text.contains("BÊN THUÊ (BÊN B)"));
            assertTrue(text.contains("Ký, ghi rõ họ tên"));assertTrue(text.contains("SHA-256:"));assertTrue(pdf.getNumberOfPages()<=2);
            assertFalse(text.contains("Phòng ngủ"));assertFalse(text.contains("phòng tắm"));assertFalse(text.contains("Trang bị:"));
            assertFalse(text.contains("Email:"));assertFalse(text.contains("Giấy chứng nhận:"));
            java.nio.file.Files.write(java.nio.file.Path.of("target/contract-preview-unsigned.pdf"),bytes);
            var renderer=new org.apache.pdfbox.rendering.PDFRenderer(pdf);
            javax.imageio.ImageIO.write(renderer.renderImageWithDPI(0,100),"png",new java.io.File("target/contract-preview-first.png"));
            javax.imageio.ImageIO.write(renderer.renderImageWithDPI(pdf.getNumberOfPages()-1,100),"png",new java.io.File("target/contract-preview-last.png"));
        }
        mvc.perform(get("/api/v1/contracts/"+contractId+"/pdf").header("Authorization",otherToken)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/contracts/"+contractId+"/pdf")).andExpect(status().isUnauthorized());
    }
    @Test void partiesSignTheirOwnSlotLockContentAndActivateOnlyAfterBothSignatures() throws Exception {
        String contract=create();String hash=JsonPath.read(contract,"$.signing.contentHash");
        sign(contract,otherToken,hash,signature(),true).andExpect(status().isNotFound());
        String ownerSigned=sign(contract,token,hash,signature(),true).andExpect(status().isOk())
            .andExpect(jsonPath("$.signing.ownerSignedAt").isNotEmpty()).andExpect(jsonPath("$.signing.customerSignedAt").isEmpty())
            .andExpect(jsonPath("$.signing.state").value("WAITING_CUSTOMER")).andExpect(jsonPath("$.status").value("DRAFT"))
            .andReturn().getResponse().getContentAsString();
        assertEquals(hash,JsonPath.read(ownerSigned,"$.signing.contentHash"));
        update(id(contract),0,terms()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_SIGNED_CONTENT"));
        sign(ownerSigned,token,hash,signature(),true).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_SIGNED"));
        sign(ownerSigned,customerToken,hash,signature(),true).andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.signing.state").value("SIGNED"));
        assertEquals(Apartment.Availability.OCCUPIED,request.getApartment().getAvailability());
        var saved=contracts.findById(Long.valueOf(id(contract))).orElseThrow();assertNull(saved.getElectricityBaseline());assertNull(saved.getWaterBaseline());
        byte[] bytes=mvc.perform(get("/api/v1/contracts/"+id(contract)+"/pdf").header("Authorization",customerToken)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();
        try(var pdf=org.apache.pdfbox.Loader.loadPDF(bytes)){
            assertTrue(new org.apache.pdfbox.text.PDFTextStripper().getText(pdf).contains("HAI BÊN ĐÃ KÝ XÁC NHẬN"));
            int images=0;for(var page:pdf.getPages())for(var name:page.getResources().getXObjectNames())if(page.getResources().isImageXObject(name))images++;
            assertEquals(2,images);
            java.nio.file.Files.write(java.nio.file.Path.of("target/contract-preview-signed.pdf"),bytes);
            var renderer=new org.apache.pdfbox.rendering.PDFRenderer(pdf);
            javax.imageio.ImageIO.write(renderer.renderImageWithDPI(pdf.getNumberOfPages()-1,100),"png",new java.io.File("target/contract-preview-signed.png"));
        }
    }
    @Test void signatureRejectsStaleContentMissingConsentAndInvalidOrBlankPng() throws Exception {
        String contract=create();String hash=JsonPath.read(contract,"$.signing.contentHash");
        sign(contract,token,"0".repeat(64),signature(),true).andExpect(status().isConflict());
        sign(contract,token,hash,signature(),false).andExpect(status().isBadRequest());
        sign(contract,token,hash,"data:image/png;base64,bm90LXBuZw==",true).andExpect(status().isBadRequest());
        var blank=new java.awt.image.BufferedImage(900,280,java.awt.image.BufferedImage.TYPE_INT_ARGB);var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(blank,"png",out);
        sign(contract,token,hash,"data:image/png;base64,"+Base64.getEncoder().encodeToString(out.toByteArray()),true).andExpect(status().isBadRequest());
        update(id(contract),0,terms().replace("6200000.50","6500000")).andExpect(status().isOk());
        sign(contract,token,hash,signature(),true).andExpect(status().isConflict());
        var d=drafts.findByContractId(Long.valueOf(id(contract))).orElseThrow();assertNull(d.getOwnerSignature());assertNull(d.getCustomerSignature());
    }
    @Test void fullySignedCustomerAppearsAsTenantAndReceivesSentInvoice() throws Exception {
        var apartment=request.getApartment();apartment.setElectricityIndex(200);apartment.setWaterIndex(50);apartments.saveAndFlush(apartment);
        String contract=create();String contractId=id(contract);String hash=JsonPath.read(contract,"$.signing.contentHash");
        sign(contract,token,hash,signature(),true).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/apartments/"+apartment.getId()+"/rental-requests").header("Authorization",customerToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].contractCompleted").value(false));
        mvc.perform(get("/api/v1/owner/contracts/"+contractId+"/billing-context").header("Authorization",token))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_STATE"));
        sign(contract,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/v1/me/apartments/"+apartment.getId()+"/rental-requests").header("Authorization",customerToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].contractCompleted").value(true))
            .andExpect(jsonPath("$[0].contractId").value(contractId));
        mvc.perform(get("/api/v1/owner/tenancies").header("Authorization",token)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(contractId)).andExpect(jsonPath("$[0].customerId").value(customer.getId().toString()))
            .andExpect(jsonPath("$[0].status").value("ACTIVE"));
        mvc.perform(get("/api/v1/me/tenancies").header("Authorization",customerToken)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(contractId)).andExpect(jsonPath("$[0].status").value("ACTIVE"));
        mvc.perform(get("/api/v1/owner/contracts/"+contractId+"/billing-context").header("Authorization",token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.electricityStartReading").value("200.00"))
            .andExpect(jsonPath("$.waterStartReading").value("50.00")).andExpect(jsonPath("$.period").value("2026-11"));
        long chain=contracts.findById(Long.valueOf(contractId)).orElseThrow().getBillingVersion();
        String invoice=mvc.perform(post("/api/v1/owner/contracts/"+contractId+"/invoices").header("Authorization",token)
            .contentType("application/json").content("{\"period\":\"2026-11\",\"electricityEndReading\":\"215\",\"waterEndReading\":\"55\",\"dueDate\":\"2026-11-28\",\"baselineVersion\":"+chain+"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.customerId").value(customer.getId().toString()))
            .andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/me/invoices").header("Authorization",customerToken)).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(post("/api/v1/owner/invoices/"+JsonPath.read(invoice,"$.id")+"/send").header("Authorization",token)
            .contentType("application/json").content("{\"version\":"+JsonPath.read(invoice,"$.version")+"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SENT"));
        mvc.perform(get("/api/v1/me/invoices").header("Authorization",customerToken)).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].contractId").value(contractId)).andExpect(jsonPath("$.items[0].customerId").value(customer.getId().toString()))
            .andExpect(result -> assertEquals(0,new BigDecimal("127500.00").compareTo(new BigDecimal(JsonPath.<String>read(result.getResponse().getContentAsString(),"$.items[0].totalAmount")))));
    }
    private ResultActions update(String id,long version,String value) throws Exception { return mvc.perform(put("/api/v1/owner/contracts/"+id+"/draft").header("Authorization",token).contentType("application/json").content("{\"version\":"+version+","+value+"}")); }
    @Test void contextReusesStoredDataAndProvidesAtLeastFiveEditableClausesWithoutSecrets() throws Exception {
        String ctx=context();assertTrue(((List<?>)JsonPath.read(ctx,"$.templateClauses")).size()>=5);
        assertEquals(owner.getFullName(),JsonPath.read(ctx,"$.snapshot.owner.fullName"));assertEquals(customer.getPhone(),JsonPath.read(ctx,"$.snapshot.customer.phone"));assertEquals("42.50",JsonPath.read(ctx,"$.snapshot.asset.areaM2"));
        assertFalse(ctx.contains("passwordHash"));assertFalse(ctx.contains("snapshotJson"));assertFalse(ctx.contains("files"));
        mvc.perform(get("/api/v1/owner/rental-requests/"+request.getId()+"/contract-context").header("Authorization",token)).andExpect(header().string("Cache-Control","no-store"));
    }
    @Test void draftPersistsAcceptedSelectionAndNeverActivatesApartmentOrInventsBaselines() throws Exception {
        String result=create();var c=contracts.findById(Long.valueOf(id(result))).orElseThrow();
        assertEquals(RentalContract.Status.DRAFT,c.getStatus());assertFalse(c.isLocalFixture());assertNull(c.getElectricityBaseline());assertNull(c.getWaterBaseline());
        assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,request.getApartment().getAvailability());assertEquals(customer.getId(),c.getCustomer().getId());
        assertEquals("Điều khoản riêng",JsonPath.read(result,"$.clauses[0].title"));assertEquals("10000000",JsonPath.read(result,"$.deposit"));
        assertEquals(id(result),JsonPath.read(context(),"$.existingDraft.id"));
    }
    @Test void snapshotIsStableAfterAccountAndAssetChangesAndAfterEditingTermsOnly() throws Exception {
        String result=create();owner.setFullName("Tên mới");accounts.saveAndFlush(owner);request.getApartment().getProperty().setAddress("Địa chỉ mới");properties.saveAndFlush(request.getApartment().getProperty());
        update(id(result),0,terms().replace("Không hút thuốc","Điều khoản mới")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.snapshot.owner.fullName").value("Thông tin đã lưu OWNER")).andExpect(jsonPath("$.snapshot.asset.address").value("12 Đường Kiểm Thử"));
        assertEquals(0,contracts.findById(Long.valueOf(id(result))).orElseThrow().getBillingVersion());
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
        mvc.perform(get("/api/v1/owner/contract-drafts").header("Authorization",token).param("propertyId",com.ancu.proptech.support.TestIds.next().toString())).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
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
        String input=body(context());for(String invalid:List.of(input.replace(today().plusYears(1).toString(),today().minusDays(1).toString()),input.replace("6200000.50","6200000.501"),input.replace("\"deposit\":\"10000000\"","\"deposit\":\"-1\""),input.replace("\"paymentDay\":5","\"paymentDay\":29"),input.replace("\"paymentDay\":5","\"paymentDay\":5.1"),input.replace("\"requestVersion\":0","\"requestVersion\":0.0"),input.replace("\"requestVersion\":0","\"requestVersion\":\"0\""),input.replace("Không hút thuốc trong căn hộ."," "))) create(token,invalid).andExpect(status().isBadRequest());
    }
    @Test void staleEditsAndNonDraftContractsCannotChangeContent() throws Exception {
        String result=create();update(id(result),0,terms().replace("6200000.50","6500000")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));update(id(result),0,terms()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));
        var c=contracts.findById(Long.valueOf(id(result))).orElseThrow();c.setStatus(RentalContract.Status.ENDED);contracts.saveAndFlush(c);update(id(result),1,terms()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_NOT_DRAFT"));
    }
    @Test void approvedDossierWithoutBankSupportsSettingsAndFrozenContractDraft() throws Exception {
        var d = new PropertyDossier();
        d.setProperty(request.getApartment().getProperty());
        d.setApplicantName(owner.getFullName());
        d.setRightType(PropertyDossier.RightType.OWNERSHIP);
        d.setStatus(PropertyDossier.Status.APPROVED);
        d.setSubmittedAt(Instant.now());
        dossiers.saveAndFlush(d);
        mvc.perform(get("/api/v1/owner/properties/" + d.getProperty().getId() + "/settings")
            .header("Authorization", token)).andExpect(status().isOk()).andExpect(jsonPath("$.receivingAccount").isEmpty());
        String saved = create();
        assertNull(JsonPath.read(saved, "$.snapshot.receivingAccount"));
        assertEquals(d.getId().toString(), JsonPath.read(saved, "$.snapshot.asset.approvedDossierId"));
        d.setBank("Later bank");
        d.setAccountNumber("12345678");
        d.setAccountHolderName(owner.getFullName());
        dossiers.saveAndFlush(d);
        update(id(saved), 0, terms()).andExpect(status().isOk())
            .andExpect(jsonPath("$.snapshot.receivingAccount").isEmpty());
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
        String result=create();var draft=drafts.findByContractId(Long.valueOf(id(result))).orElseThrow();
        draft.setSnapshotJson(draft.getSnapshotJson().replaceAll(",\"(?:documentNumber|documentIssueDate|documentIssuePlace|permanentAddress|identityVerificationStatus|localFixture|certificateNumber|certificateIssueDate|certificateIssuePlace|exploitationRightDescription|evidence)\":null",""));drafts.saveAndFlush(draft);
        mvc.perform(get("/api/v1/contracts/"+id(result)).header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.snapshot.owner.fullName").value(owner.getFullName())).andExpect(jsonPath("$.snapshot.asset.certificateNumber").isEmpty()).andExpect(jsonPath("$.snapshot.evidence").isEmpty());
    }
    @Test void signaturesRequireOtpAndWrongOtpLeavesContractUnsigned()throws Exception{
        String contract=create();String image=signature();String contractId=id(contract);
        String hash=JsonPath.read(contract,"$.signing.contentHash");
        String body="{\"version\":"+JsonPath.read(contract,"$.version")+",\"contentHash\":\""+hash+"\",\"signature\":\""+image+"\",\"consent\":true}";
        String url="/api/v1/contracts/"+contractId;
        mvc.perform(post(url+"/signatures").header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isBadRequest());
        var issued=mvc.perform(post(url+"/signature-otp").header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String challenge=JsonPath.read(issued,"$.challengeId");String correct=otpCode;String wrong=correct.equals("000000")?"111111":"000000";
        String prefix=body.substring(0,body.length()-1)+",\"challengeId\":\""+challenge+"\",\"code\":\"";
        mvc.perform(post(url+"/signatures").header("Authorization",token).contentType("application/json").content(prefix+wrong+"\"}")).andExpect(status().isBadRequest());
        mvc.perform(get(url).header("Authorization",token)).andExpect(jsonPath("$.signing.ownerSignedAt").isEmpty()).andExpect(jsonPath("$.status").value("DRAFT"));
        assertEquals(1,otpChallenges.findById(challenge).orElseThrow().getAttempts());
        mvc.perform(post(url+"/signatures").header("Authorization",token).contentType("application/json").content(prefix+correct+"\"}")).andExpect(status().isOk());
    }


    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans={true,false})
    void pastStartCannotRequestSignatureOtpForEitherParty(boolean ownerFirst)throws Exception{
        String saved=create();var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();
        c.setStartDate(today().minusDays(1));contracts.saveAndFlush(c);saved=readContract(id(saved));
        sign(saved,ownerFirst?token:customerToken,JsonPath.read(saved,"$.signing.contentHash"),signature(),true)
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_IN_PAST"));
        assertTrue(otpChallenges.findAll().stream().noneMatch(challenge->Set.of(owner.getId(),customer.getId()).contains(challenge.getAccountId())));
        var d=drafts.findByContractId(c.getId()).orElseThrow();assertNull(d.getOwnerSignedAt());assertNull(d.getCustomerSignedAt());
        assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,request.getApartment().getAvailability());
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans={true,false})
    void signatureOtpIssuedBeforeMidnightCannotSignPastStartAfterMidnight(boolean firstSignatureAlreadySaved)throws Exception{
        String saved=create();String documentHash=JsonPath.read(saved,"$.signing.contentHash");
        if(firstSignatureAlreadySaved)sign(saved,token,documentHash,signature(),true).andExpect(status().isOk());
        String actor=firstSignatureAlreadySaved?customerToken:token;expireOtpCooldown();
        var input=new LinkedHashMap<String,Object>(Map.of("version",JsonPath.<Number>read(saved,"$.version"),"contentHash",documentHash,"signature",signature(),"consent",true));
        String challenge=mvc.perform(post("/api/v1/contracts/"+id(saved)+"/signature-otp").header("Authorization",actor).contentType("application/json").content(json.writeValueAsString(input)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        input.put("challengeId",JsonPath.<String>read(challenge,"$.challengeId"));input.put("code",otpCode);
        org.mockito.Mockito.doReturn(today().plusDays(1)).when(signingDates).today();
        mvc.perform(post("/api/v1/contracts/"+id(saved)+"/signatures").header("Authorization",actor).contentType("application/json").content(json.writeValueAsString(input)))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_IN_PAST"));
        var d=drafts.findByContractId(Long.valueOf(id(saved))).orElseThrow();
        assertEquals(firstSignatureAlreadySaved,d.getOwnerSignedAt()!=null);assertNull(d.getCustomerSignedAt());
        assertEquals(RentalContract.Status.DRAFT,d.getContract().getStatus());assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,request.getApartment().getAvailability());
    }


    private String signedFutureFirstLease()throws Exception{
        String input=body(context()).replace("\"startDate\":\""+today()+"\"","\"startDate\":\""+today().plusDays(2)+"\"");
        String saved=create(token,input).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String hash=JsonPath.read(saved,"$.signing.contentHash");
        sign(saved,token,hash,signature(),true).andExpect(status().isOk());
        sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT")).andExpect(jsonPath("$.signing.state").value("SIGNED"));
        return readContract(id(saved));
    }
    @Test void signedFutureFirstLeaseReservesRoomAndActivatesOnlyAtStartIdempotently()throws Exception{
        var apartment=request.getApartment();apartment.setElectricityIndex(200);apartment.setWaterIndex(50);apartments.saveAndFlush(apartment);
        String saved=signedFutureFirstLease();Long contractId=Long.valueOf(id(saved));var c=contracts.findById(contractId).orElseThrow();
        assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,apartment.getAvailability());assertNull(c.getBaselineDate());
        assertFalse(drafts.dueSignedInitials(today()).contains(contractId));initialActivation.activate(contractId);assertEquals(RentalContract.Status.DRAFT,c.getStatus());
        String hash=JsonPath.read(saved,"$.signing.contentHash");var d=drafts.findByContractId(contractId).orElseThrow();var ownerAt=d.getOwnerSignedAt();var customerAt=d.getCustomerSignedAt();var snapshot=d.getSnapshotJson();
        org.mockito.Mockito.doReturn(c.getStartDate()).when(signingDates).today();
        assertTrue(drafts.dueSignedInitials(c.getStartDate()).contains(contractId));initialActivation.activate(contractId);
        assertEquals(RentalContract.Status.ACTIVE,c.getStatus());assertEquals(Apartment.Availability.OCCUPIED,apartment.getAvailability());
        assertEquals(0,new BigDecimal("200").compareTo(c.getElectricityBaseline()));assertEquals(c.getStartDate(),c.getBaselineDate());
        long version=c.getVersion();initialActivation.activate(contractId);assertEquals(version,c.getVersion());
        assertEquals(ownerAt,d.getOwnerSignedAt());assertEquals(customerAt,d.getCustomerSignedAt());assertEquals(snapshot,d.getSnapshotJson());assertEquals(hash,JsonPath.read(readContract(contractId.toString()),"$.signing.contentHash"));
    }
    @Test void futureSignedFirstLeaseCannotBillAndCannotEditSignedContent()throws Exception{
        String saved=signedFutureFirstLease();String contractId=id(saved);
        mvc.perform(get("/api/v1/owner/contracts/"+contractId+"/billing-context").header("Authorization",token)).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/owner/contracts/"+contractId+"/rent-billing-context").header("Authorization",token)).andExpect(status().isConflict());
        update(contractId,0,terms()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONTRACT_SIGNED_CONTENT"));
        mvc.perform(get("/api/v1/me/tenancies").header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("DRAFT")).andExpect(jsonPath("$[0].inAppSigningStatus").value("BOTH_SIGNED"));
    }
    @Test void waitingFirstLeaseActivationRechecksEligibilityAndNeverInventsMeterReadings()throws Exception{
        String saved=signedFutureFirstLease();var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();
        org.mockito.Mockito.doReturn(c.getStartDate()).when(signingDates).today();customer.setStatus(AuthAccount.Status.LOCKED);accounts.saveAndFlush(customer);
        var failure=assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->initialActivation.activate(c.getId()));assertEquals("CONTRACT_ACTIVATION_BLOCKED",failure.code);
        assertEquals(RentalContract.Status.DRAFT,c.getStatus());assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,request.getApartment().getAvailability());assertNull(c.getElectricityBaseline());
    }
    @Test void fullySignedWaitingFirstLeaseCancellationNeedsCounterpartyAndBlocksActivation()throws Exception{
        String saved=signedFutureFirstLease();String path="/api/v1/rental-requests/"+request.getId()+"/cancellation";
        var state=json.readTree(mvc.perform(get(path).header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.canStart").value(true)).andReturn().getResponse().getContentAsString());
        mvc.perform(post(path+"/actions").header("Authorization",token).contentType("application/json").content(json.writeValueAsString(Map.of("action","START","sourceVersion",state.path("sourceVersion").asString(),"reason","Hai bên không tiếp tục trước hiệu lực"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("PENDING"));
        var c=contracts.findById(Long.valueOf(id(saved))).orElseThrow();org.mockito.Mockito.doReturn(c.getStartDate()).when(signingDates).today();
        var failure=assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->initialActivation.activate(c.getId()));assertEquals("CANCELLATION_PENDING",failure.code);
        state=json.readTree(mvc.perform(get(path).header("Authorization",customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.canRespond").value(true)).andReturn().getResponse().getContentAsString());
        mvc.perform(post(path+"/actions").header("Authorization",customerToken).contentType("application/json").content(json.writeValueAsString(Map.of("action","ACCEPT","sourceVersion",state.path("sourceVersion").asString()))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("CANCELLED"));
        assertEquals(RentalContract.Status.CANCELLED,c.getStatus());assertEquals(Apartment.Availability.VACANT,request.getApartment().getAvailability());
        assertEquals("SIGNED",JsonPath.read(readContract(id(saved)),"$.signing.state"));assertEquals(JsonPath.<String>read(saved,"$.signing.contentHash"),JsonPath.<String>read(readContract(id(saved)),"$.signing.contentHash"));
    }


    @Test void localTestModeSignsBothPartiesWithoutOtpAndStillChecksDocumentConsentAndDate()throws Exception{
        org.mockito.Mockito.doReturn(false).when(signingOtpPolicy).required();
        String saved=create();String cid=id(saved);String hash=JsonPath.read(saved,"$.signing.contentHash");
        assertFalse(JsonPath.<Boolean>read(saved,"$.signing.otpRequired"));
        var input=new LinkedHashMap<String,Object>(Map.of("version",0,"contentHash",hash,"signature",signature(),"consent",true));
        String url="/api/v1/contracts/"+cid;
        mvc.perform(post(url+"/signature-otp").header("Authorization",token).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SIGNING_OTP_DISABLED"));
        input.put("consent",false);mvc.perform(post(url+"/signatures").header("Authorization",token).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isBadRequest());
        input.put("consent",true);input.put("contentHash","b".repeat(64));mvc.perform(post(url+"/signatures").header("Authorization",token).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isConflict());
        input.put("contentHash",hash);mvc.perform(post(url+"/signatures").header("Authorization",otherToken).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isNotFound());
        org.mockito.Mockito.doReturn(today().plusDays(1)).when(signingDates).today();
        mvc.perform(post(url+"/signatures").header("Authorization",token).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CONTRACT_START_DATE_IN_PAST"));
        org.mockito.Mockito.doReturn(today()).when(signingDates).today();
        mvc.perform(post(url+"/signatures").header("Authorization",token).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT"));
        mvc.perform(post(url+"/signatures").header("Authorization",customerToken).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        assertEquals(Apartment.Availability.OCCUPIED,request.getApartment().getAvailability());
        org.mockito.Mockito.verify(otpSender,org.mockito.Mockito.never()).sendAction(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString());
        assertTrue(otpChallenges.findAll().stream().noneMatch(c->Set.of(owner.getId(),customer.getId()).contains(c.getAccountId())));
    }
    private String calendarQuarter(boolean future)throws Exception{
        org.mockito.Mockito.doReturn(LocalDate.of(2027,1,future?13:15)).when(signingDates).today();
        String input=body(context()).replace("\"startDate\":\""+today()+"\"","\"startDate\":\"2027-01-15\"")
            .replace(today().plusYears(1).toString(),"2027-07-14").replace("6200000.50","3000000");
        input=input.substring(0,input.length()-1)+",\"rentCycleMonths\":3}";
        return create(token,input).andExpect(status().isCreated()).andExpect(jsonPath("$.calendarRentBilling").value(true)).andExpect(jsonPath("$.oneMonthRentPackage").value(false)).andReturn().getResponse().getContentAsString();
    }
    private void assertCalendarRent(String id,String start,String end,String due,String amount){
        var row=jdbc.queryForMap("SELECT * FROM rental_invoices WHERE contract_id=? AND coverage_start=? AND status='SENT' AND kind='RENT'",Long.valueOf(id),java.sql.Date.valueOf(start));
        assertEquals(java.sql.Date.valueOf(end),row.get("coverage_end"));assertEquals(java.sql.Date.valueOf(due),row.get("due_date"));assertEquals(0,new BigDecimal(amount).compareTo((BigDecimal)row.get("total_amount")));assertNotNull(row.get("rent_calculation"));
    }
    @Test void activationAutomaticallySendsFirstPartialMonthPlusTwoWholeMonthsAndScheduledCyclesCapFinalDate()throws Exception{
        String saved=calendarQuarter(false),hash=JsonPath.read(saved,"$.signing.contentHash"),id=id(saved);
        sign(saved,token,hash,signature(),true).andExpect(status().isOk());assertEquals(0,rentCount(id));
        sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        assertCalendarRent(id,"2027-01-15","2027-03-31","2027-01-15","7645161");assertEquals(1,rentCount(id));
        initialActivation.activate(Long.valueOf(id));packageInvoices.prepareScheduledRent(Long.valueOf(id));assertEquals(1,rentCount(id));
        org.mockito.Mockito.doReturn(LocalDate.of(2027,3,28)).when(signingDates).today();packageInvoices.prepareScheduledRent(Long.valueOf(id));assertEquals(1,rentCount(id));
        org.mockito.Mockito.doReturn(LocalDate.of(2027,3,29)).when(signingDates).today();packageInvoices.prepareScheduledRent(Long.valueOf(id));assertCalendarRent(id,"2027-04-01","2027-06-30","2027-04-05","9000000");
        org.mockito.Mockito.doReturn(LocalDate.of(2027,6,28)).when(signingDates).today();packageInvoices.prepareScheduledRent(Long.valueOf(id));assertCalendarRent(id,"2027-07-01","2027-07-14","2027-07-05","1354839");
        packageInvoices.prepareScheduledRent(Long.valueOf(id));assertEquals(3,rentCount(id));
    }
    @Test void signedFutureCalendarLeaseSendsNothingUntilActivationDayThenSendsOnlyOneInvoice()throws Exception{
        String saved=calendarQuarter(true),hash=JsonPath.read(saved,"$.signing.contentHash"),id=id(saved);
        sign(saved,token,hash,signature(),true).andExpect(status().isOk());sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT"));
        initialActivation.activate(Long.valueOf(id));assertEquals(0,rentCount(id));
        org.mockito.Mockito.doReturn(LocalDate.of(2027,1,15)).when(signingDates).today();initialActivation.activate(Long.valueOf(id));packageInvoices.prepareScheduledRent(Long.valueOf(id));assertEquals(1,rentCount(id));assertCalendarRent(id,"2027-01-15","2027-03-31","2027-01-15","7645161");
    }
    @Test void cancellingPriorUnpaidCalendarRentDoesNotAutoResendAndOwnerCanExplicitlyRecreateGap()throws Exception{
        String saved=calendarQuarter(false),hash=JsonPath.read(saved,"$.signing.contentHash"),id=id(saved);
        sign(saved,token,hash,signature(),true).andExpect(status().isOk());sign(saved,customerToken,hash,signature(),true).andExpect(status().isOk());
        org.mockito.Mockito.doReturn(LocalDate.of(2027,3,29)).when(signingDates).today();packageInvoices.prepareScheduledRent(Long.valueOf(id));
        Long invoiceId=jdbc.queryForObject("SELECT id FROM rental_invoices WHERE contract_id=? AND kind='RENT' AND coverage_start='2027-01-15'",Long.class,Long.valueOf(id));
        String current=mvc.perform(get("/api/v1/invoices/"+invoiceId).header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/v1/owner/invoices/"+invoiceId+"/cancel").header("Authorization",token).contentType("application/json").content("{\"version\":"+JsonPath.read(current,"$.version")+",\"billingVersion\":"+JsonPath.read(current,"$.billingVersion")+",\"reason\":\"Cần lập lại\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        packageInvoices.prepareScheduledRent(Long.valueOf(id));assertEquals(1,rentCount(id));
        var c=contracts.findById(Long.valueOf(id)).orElseThrow();mvc.perform(post("/api/v1/owner/contracts/"+id+"/rent-invoices").header("Authorization",token).contentType("application/json").content("{\"billingVersion\":"+c.getBillingVersion()+",\"coverageStart\":\"2027-01-15\",\"dueDate\":\"2027-01-15\"}"))
            .andExpect(status().isOk());assertEquals(2,rentCount(id));packageInvoices.prepareScheduledRent(Long.valueOf(id));assertEquals(2,rentCount(id));
    }
}
