package com.ancu.proptech.controller.billing;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.repository.billing.InvoiceNotificationRepository;
import com.ancu.proptech.service.auth.AuthService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class BillingIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;@Autowired RentalContractRepository contracts;
    @Autowired InvoiceNotificationRepository notifications;@Autowired AuthService auth;@Autowired PasswordEncoder encoder;@Autowired JdbcTemplate jdbc;
    private AuthAccount owner,tenant,otherOwner,otherTenant;private Property property;private Apartment apartment;private RentalContract contract;private String ownerToken,tenantToken;
    @BeforeEach void fixture(){
        owner=account(AuthAccount.Role.OWNER);tenant=account(AuthAccount.Role.CUSTOMER);otherOwner=account(AuthAccount.Role.OWNER);otherTenant=account(AuthAccount.Role.CUSTOMER);
        property=new Property();property.setOwner(owner);property.setName("Billing test");property.setAddress("Test address");property.setCity("Test city");property.setDistrict("District");property.setWard("Ward");property.setApprovalStatus(Property.ApprovalStatus.APPROVED);property=properties.saveAndFlush(property);
        apartment=new Apartment();apartment.setProperty(property);apartment.setRoomNumber("TEST.101");apartment.setTitle("Billing test apartment");apartment.setDescription("Test");apartment.setAreaM2(new BigDecimal("30"));apartment.setAdvertisedMonthlyRent(new BigDecimal("9999999"));apartment.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);apartment.setAvailability(Apartment.Availability.OCCUPIED);apartment.setCreatedAt(java.time.Instant.now());apartment=apartments.saveAndFlush(apartment);
        contract=new RentalContract();contract.setApartment(apartment);contract.setCustomer(tenant);contract.setStatus(RentalContract.Status.ACTIVE);contract.setStartDate(LocalDate.of(2026,10,1));contract.setEndDate(LocalDate.of(2027,9,30));contract.setBaselineDate(contract.getStartDate());contract.setMonthlyRent(new BigDecimal("5000000"));contract.setElectricityUnitPrice(new BigDecimal("3500"));contract.setWaterUnitPrice(new BigDecimal("15000"));contract.setElectricityBaseline(new BigDecimal("1000"));contract.setWaterBaseline(new BigDecimal("200"));contract=contracts.saveAndFlush(contract);
        ownerToken=token(owner);tenantToken=token(tenant);
    }
    private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail("billing-"+UUID.randomUUID()+"@example.invalid");a.setFullName("Billing test account");a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setContactVerified(true);a.setEmailVerified(true);a.setPasswordHash(encoder.encode("Billing-test!12345"));return accounts.saveAndFlush(a);}
    private String token(AuthAccount a){return auth.login(a.getEmail(),"Billing-test!12345").tokens().accessToken();}
    private String body(String period,long version,String electric,String water){return "{\"period\":\""+period+"\",\"baselineVersion\":"+version+",\"electricityEndReading\":\""+electric+"\",\"waterEndReading\":\""+water+"\",\"dueDate\":\"2027-10-05\"}";}
    private ResultActions create(String token,String body)throws Exception{return mvc.perform(post("/api/v1/owner/contracts/"+contract.getId()+"/invoices").header("Authorization","Bearer "+token).contentType("application/json").content(body));}
    private String createDraft()throws Exception{return JsonPath.read(create(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),"$.id");}
    private ResultActions send(String token,String id,long version)throws Exception{return mvc.perform(post("/api/v1/owner/invoices/"+id+"/send").header("Authorization","Bearer "+token).contentType("application/json").content("{\"version\":"+version+"}"));}
    @Test void propertyFilterControlsInvoiceCountBeforePaginationAndKeepsOwnerScope()throws Exception{
        String firstId=createDraft();
        send(ownerToken,firstId,0).andExpect(status().isOk());
        create(ownerToken,body("2026-11",2,"1200","212")).andExpect(status().isCreated());
        var second=new Property();second.setOwner(owner);second.setName("Empty second property");second.setAddress("Test");
        second.setCity("City");second.setDistrict("District");second.setApprovalStatus(Property.ApprovalStatus.DRAFT);properties.saveAndFlush(second);
        mvc.perform(get("/api/v1/owner/invoices").header("Authorization","Bearer "+ownerToken)
                .param("propertyId",property.getId().toString()).param("size","1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(2));
        mvc.perform(get("/api/v1/owner/invoices").header("Authorization","Bearer "+ownerToken)
                .param("propertyId",second.getId().toString()).param("size","1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/owner/invoices").header("Authorization","Bearer "+token(otherOwner))
                .param("propertyId",property.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty()).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void serverCalculatesFromContractAndTenantReceivesOnlySentInvoice()throws Exception{
        var result=create(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isCreated()).andReturn();
        var json=result.getResponse().getContentAsString();String id=JsonPath.read(json,"$.id");
        assertEquals(0,new BigDecimal(JsonPath.<String>read(json,"$.totalAmount")).compareTo(new BigDecimal("5540000")));
        assertEquals(0,new BigDecimal(JsonPath.<String>read(json,"$.electricityQuantity")).compareTo(new BigDecimal("120")));
        mvc.perform(get("/api/v1/me/invoices").header("Authorization","Bearer "+tenantToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/invoices/"+id).header("Authorization","Bearer "+tenantToken)).andExpect(status().isNotFound());
        send(ownerToken,id,0).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SENT"));
        send(ownerToken,id,0).andExpect(status().isOk());assertEquals(1,notifications.countByInvoiceId(UUID.fromString(id)));
        mvc.perform(get("/api/v1/me/invoices").header("Authorization","Bearer "+tenantToken)).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(id));
    }
    @Test void crossOwnerCrossTenantAndGuestAccessAreDenied()throws Exception{
        String id=createDraft();send(ownerToken,id,0).andExpect(status().isOk());
        create(token(otherOwner),body("2026-11",2,"1200","210")).andExpect(status().isNotFound());
        send(token(otherOwner),id,1).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/invoices/"+id).header("Authorization","Bearer "+token(otherTenant))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/me/invoices").header("Authorization","Bearer "+token(otherTenant))).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/me/invoices")).andExpect(status().isUnauthorized());
        create(tenantToken,body("2026-10",0,"1120","208")).andExpect(status().isForbidden());
    }
    @Test void meterBaselineDecreasingReadingsAndReadonlyFieldsAreRejected()throws Exception{
        create(ownerToken,body("2026-10",0,"999","208")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_METER_READING"));
        for(String field:new String[]{"totalAmount","monthlyRent","electricityStartReading","electricityQuantity","customerId"})create(ownerToken,body("2026-10",0,"1120","208").replace("\"baselineVersion\":0","\""+field+"\":1,\"baselineVersion\":0")).andExpect(status().isBadRequest());
        contract.setElectricityBaseline(null);contracts.saveAndFlush(contract);
        create(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("METER_BASELINE_MISSING"));
    }
    @Test void duplicateSkippedDraftAndStaleBillingPeriodsAreRejected()throws Exception{
        create(ownerToken,body("2026-10",9,"1120","208")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        create(ownerToken,body("2026-11",0,"1120","208")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BILLING_SEQUENCE_CONFLICT"));
        String id=createDraft();create(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_BILLING_PERIOD"));
        create(ownerToken,body("2026-11",1,"1200","212")).andExpect(status().isConflict());
        send(ownerToken,id,9).andExpect(status().isConflict());send(ownerToken,id,0).andExpect(status().isOk());
        mvc.perform(get("/api/v1/owner/contracts/"+contract.getId()+"/billing-context").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.period").value("2026-11"));
        create(ownerToken,body("2026-11",2,"1200.25","212.50")).andExpect(status().isCreated());
    }
    @Test void endedContractKeepsInvoiceHistoryButCannotCreateNewBills()throws Exception{
        String id=createDraft();send(ownerToken,id,0).andExpect(status().isOk());contract.setStatus(RentalContract.Status.ENDED);contracts.saveAndFlush(contract);
        mvc.perform(get("/api/v1/invoices/"+id).header("Authorization","Bearer "+tenantToken)).andExpect(status().isOk());
        create(ownerToken,body("2026-11",2,"1200","212")).andExpect(status().isConflict());
    }
    @Test void addressOptionsAndWardFiltersUseOnlyVisibleCatalog()throws Exception{
        apartment.setAvailability(Apartment.Availability.VACANT);apartments.saveAndFlush(apartment);
        mvc.perform(get("/api/v1/apartments").param("city","Test city").param("district","District").param("ward","Ward")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/apartments").param("ward","Unknown ward")).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/apartments/address-options")).andExpect(status().isOk());
        property.setApprovalStatus(Property.ApprovalStatus.PENDING_APPROVAL);properties.saveAndFlush(property);
        mvc.perform(get("/api/v1/apartments").param("ward","Ward")).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void concurrentSendsAreIdempotentAndDoNotDuplicateNotifications()throws Exception{
        String id=createDraft();TestTransaction.flagForCommit();TestTransaction.end();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try{Callable<Integer> task=()->{gate.await();return send(ownerToken,id,0).andReturn().getResponse().getStatus();};var a=pool.submit(task);var b=pool.submit(task);gate.countDown();assertEquals(200,a.get(15,TimeUnit.SECONDS));assertEquals(200,b.get(15,TimeUnit.SECONDS));assertEquals(1,notifications.countByInvoiceId(UUID.fromString(id)));}
        finally{pool.shutdownNow();cleanupCommitted();}
    }
    @Test void concurrentCreatesCommitOnlyOneInvoiceForThePeriod()throws Exception{
        TestTransaction.flagForCommit();TestTransaction.end();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try{Callable<Integer> task=()->{gate.await();return create(ownerToken,body("2026-10",0,"1120","208")).andReturn().getResponse().getStatus();};var a=pool.submit(task);var b=pool.submit(task);gate.countDown();var statuses=new ArrayList<>(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS)));Collections.sort(statuses);assertEquals(List.of(201,409),statuses);assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM rental_invoices WHERE contract_id=?",Integer.class,contract.getId().toString()));}
        finally{pool.shutdownNow();cleanupCommitted();}
    }
    private void cleanupCommitted(){
        String cid=contract.getId().toString(),aid=apartment.getId().toString();
        jdbc.update("DELETE FROM invoice_notifications WHERE invoice_id IN(SELECT id FROM rental_invoices WHERE contract_id=?)",cid);jdbc.update("DELETE FROM rental_invoices WHERE contract_id=?",cid);jdbc.update("DELETE FROM rental_contracts WHERE id=?",cid);jdbc.update("DELETE FROM rental_apartment_amenities WHERE apartment_id=?",aid);jdbc.update("DELETE FROM rental_apartments WHERE id=?",aid);jdbc.update("DELETE FROM rental_properties WHERE id=?",property.getId().toString());
        for(var account:List.of(owner,tenant,otherOwner,otherTenant)){String id=account.getId().toString();jdbc.update("DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id=?)",id);jdbc.update("DELETE FROM auth_sessions WHERE account_id=?",id);jdbc.update("DELETE FROM auth_accounts WHERE id=?",id);}
    }
}
