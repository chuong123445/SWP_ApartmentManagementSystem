package com.ancu.proptech.controller.contract;

import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.AuthService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class TenancySummaryIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;
    @Autowired RentalContractRepository contracts;
    @Autowired ContractDraftRepository drafts;
    @Autowired RentalRequestRepository requests;
    @Autowired ExternalIdentityRepository identities;
    @Autowired AuthService auth;
    @Autowired PasswordEncoder encoder;

    private AuthAccount account(AuthAccount.Role role) {
        var a = new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");
        a.setFullName("Khách kiểm thử");a.setPasswordHash(encoder.encode("Test!12345678"));a.setRole(role);
        a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setIdentityVerified(true);
        return accounts.saveAndFlush(a);
    }
    private String token(AuthAccount a) { return "Bearer "+auth.login(a.getEmail(),"Test!12345678").tokens().accessToken(); }
    private RentalContract contract(AuthAccount owner, AuthAccount customer, String room) {
        var p = new Property();p.setOwner(owner);p.setName("Tòa thử "+room);p.setAddress("Test");p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(p);
        var a = new Apartment();a.setProperty(p);a.setRoomNumber(room);a.setTitle("Căn thử");a.setDescription("Test");a.setAreaM2(new BigDecimal("30"));a.setAdvertisedMonthlyRent(new BigDecimal("5000000"));a.setDeposit(new BigDecimal("9999999"));a.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);a.setAvailability(Apartment.Availability.OCCUPIED);a.setCreatedAt(Instant.now());apartments.saveAndFlush(a);
        var c = new RentalContract();c.setApartment(a);c.setCustomer(customer);c.setStatus(RentalContract.Status.ACTIVE);c.setStartDate(LocalDate.of(2026,1,1));c.setEndDate(LocalDate.of(2027,1,1));c.setMonthlyRent(new BigDecimal("5000000"));c.setElectricityUnitPrice(new BigDecimal("3500"));c.setWaterUnitPrice(new BigDecimal("15000"));return contracts.saveAndFlush(c);
    }
    private ContractDraft terms(RentalContract c, String deposit) {
        var r = new RentalRequest();r.setApartment(c.getApartment());r.setCustomer(c.getCustomer());r.setMessage("Test");r.setStatus(RentalRequest.Status.ACCEPTED);r.setCreatedAt(Instant.now());requests.saveAndFlush(r);
        var d = new ContractDraft();d.setContract(c);d.setRentalRequest(r);d.setDeposit(new BigDecimal(deposit));d.setPaymentDay(5);d.setPaymentMethod("Tiền mặt");d.setUsagePurpose("Để ở");d.setCreatedAt(Instant.now());d.setSnapshotJson("{\"privateDocumentNumber\":\"DO_NOT_EXPOSE\"}");d.setClausesJson("[]");return drafts.saveAndFlush(d);
    }
    private List<Map<String,Object>> read(String path, AuthAccount account) throws Exception {
        var response = mvc.perform(get(path).header("Authorization",token(account))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsString();
        assertFalse(response.contains("DO_NOT_EXPOSE"));assertFalse(response.contains("snapshotJson"));assertFalse(response.contains("ownerSignature"));assertFalse(response.contains("documentNumber"));assertFalse(response.contains("depositReceived"));
        return JsonPath.read(response,"$");
    }
    @Test void depositIsContractSpecificAndMissingLegacyDataIsNullNotAdvertisedAmount() throws Exception {
        var owner = account(AuthAccount.Role.OWNER);var tenant = account(AuthAccount.Role.CUSTOMER);
        var first = contract(owner,tenant,"A101");var second = contract(owner,tenant,"A102");var legacy = contract(owner,tenant,"A103");
        terms(first,"5000000.25");terms(second,"0");
        var rows = read("/api/v1/owner/tenancies",owner);assertEquals(3,rows.size());
        var byId = new HashMap<String,Map<String,Object>>();rows.forEach(row -> byId.put((String)row.get("id"),row));
        assertEquals("5000000.25",byId.get(first.getId().toString()).get("contractDeposit"));
        assertEquals(0,new BigDecimal((String)byId.get(second.getId().toString()).get("contractDeposit")).signum());
        assertNull(byId.get(legacy.getId().toString()).get("contractDeposit"));
        assertEquals("NO_DATA",byId.get(legacy.getId().toString()).get("inAppSigningStatus"));
        assertEquals(3,read("/api/v1/me/tenancies",tenant).size());
        assertTrue(read("/api/v1/owner/tenancies",account(AuthAccount.Role.OWNER)).isEmpty());
        assertTrue(read("/api/v1/me/tenancies",account(AuthAccount.Role.CUSTOMER)).isEmpty());
        mvc.perform(get("/api/v1/owner/tenancies").header("Authorization",token(tenant))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/me/tenancies")).andExpect(status().isUnauthorized());
    }
    @Test void persistedSigningAndVerificationAreIndependentOfActiveAndSummaryFlags() throws Exception {
        var owner = account(AuthAccount.Role.OWNER);var tenant = account(AuthAccount.Role.CUSTOMER);var c = contract(owner,tenant,"A201");var d = terms(c,"2000000");
        var initial = read("/api/v1/owner/tenancies",owner).getFirst();
        assertEquals(true,initial.get("customerEmailVerified"));assertEquals("NOT_VERIFIED",initial.get("customerIdentityStatus"));assertNull(initial.get("customerIdentitySource"));assertEquals("UNSIGNED",initial.get("inAppSigningStatus"));
        d.setOwnerSignedAt(Instant.now());drafts.saveAndFlush(d);assertEquals("OWNER_SIGNED",read("/api/v1/owner/tenancies",owner).getFirst().get("inAppSigningStatus"));
        d.setCustomerSignedAt(Instant.now());drafts.saveAndFlush(d);c.setLocalFixture(true);contracts.saveAndFlush(c);
        var evidence = new ExternalIdentity();evidence.setAccountId(tenant.getId());evidence.setIssuer("https://issuer.example.invalid/");evidence.setSubject("private-subject");evidence.setDocumentNumber("012345678901");evidence.setLegalName("Tên riêng tư");evidence.setDateOfBirth(LocalDate.of(1990,1,1));evidence.setGender("Nam");evidence.setAddress("Địa chỉ riêng tư");evidence.setSource("AUTH0_VNEID_SIMULATION");evidence.setVerificationStatus("VERIFIED");evidence.setVerifiedAt(Instant.now());identities.saveAndFlush(evidence);
        tenant.setEmailVerified(false);accounts.saveAndFlush(tenant);
        var verified = read("/api/v1/owner/tenancies",owner).getFirst();assertEquals(false,verified.get("customerEmailVerified"));assertEquals("VERIFIED",verified.get("customerIdentityStatus"));assertEquals("AUTH0_VNEID_SIMULATION",verified.get("customerIdentitySource"));assertEquals("BOTH_SIGNED",verified.get("inAppSigningStatus"));assertEquals(true,verified.get("localFixture"));
        var json = verified.toString();assertFalse(json.contains("private-subject"));assertFalse(json.contains("012345678901"));assertFalse(json.contains("Tên riêng tư"));
        identities.delete(evidence);identities.flush();assertEquals("NOT_VERIFIED",read("/api/v1/owner/tenancies",owner).getFirst().get("customerIdentityStatus"));
    }
}
