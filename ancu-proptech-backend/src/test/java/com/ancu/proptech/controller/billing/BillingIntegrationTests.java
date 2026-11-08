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
    @Autowired com.ancu.proptech.repository.payment.TestPaymentRepository receipts;
    private com.ancu.proptech.model.payment.TestPayment receipt(boolean paid,boolean received){
        var p=new com.ancu.proptech.model.payment.TestPayment();p.setOwnerId(owner.getId());p.setCustomerId(received?tenant.getId():null);p.setContractId(received?contract.getId():null);
        p.setPaymentCode("ANCUTEST"+UUID.randomUUID().toString().replace("-","").substring(0,24));p.setBank("MB");p.setAccountNumber("12345678");p.setAccountHolderName("Owner");p.setAmount(new BigDecimal("2000"));p.setCreatedAt(java.time.Instant.now());if(paid)p.setPaidAt(java.time.Instant.now());return receipts.saveAndFlush(p);
    }
    @Test void ownerReceivedHistoryIncludesOlderPaidReceiptsAndEnforcesScopeBeforePaging()throws Exception{
        var first=receipt(true,true);for(int i=0;i<20;i++)receipt(true,true);receipt(false,true);var ownerOnly=receipt(true,false);
        var mismatched=receipt(true,true);mismatched.setCustomerId(otherTenant.getId());receipts.saveAndFlush(mismatched);
        String path="/api/v1/owner/invoices/additional";
        mvc.perform(get(path).header("Authorization","Bearer "+ownerToken).param("paymentStatus","PAID").param("page","1").param("size","20"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.totalElements").value(21)).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].id").value(first.getId().toString())).andExpect(jsonPath("$.items[0].payment.status").value("PAID"));
        mvc.perform(get(path).header("Authorization","Bearer "+ownerToken).param("paymentStatus","UNPAID")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get(path).header("Authorization","Bearer "+ownerToken).param("propertyId",property.getId().toString())).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(22));
        mvc.perform(get(path).header("Authorization","Bearer "+ownerToken).param("propertyId","999999999")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(path).header("Authorization","Bearer "+token(otherOwner))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(path+"/"+first.getId()).header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.payment.paidAt").isNotEmpty());
        mvc.perform(get(path+"/"+first.getId()).header("Authorization","Bearer "+token(otherOwner))).andExpect(status().isNotFound());
        mvc.perform(get(path+"/"+ownerOnly.getId()).header("Authorization","Bearer "+ownerToken)).andExpect(status().isNotFound());
        mvc.perform(get(path+"/"+mismatched.getId()).header("Authorization","Bearer "+ownerToken)).andExpect(status().isNotFound());
        mvc.perform(get(path).header("Authorization","Bearer "+tenantToken)).andExpect(status().isForbidden());
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header("Authorization","Bearer "+ownerToken).param("size","101")).andExpect(status().isBadRequest());
    }
    @Test void ownerMonthlyFiltersPaidAndUnpaidSeparatelyFromIssuanceBeforePaging()throws Exception{
        String paidId=createDraft();send(ownerToken,paidId,0).andExpect(status().isOk());
        String second=JsonPath.read(create(ownerToken,body("2026-11",2,"1200","212")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),"$.id");send(ownerToken,second,0).andExpect(status().isOk());
        create(ownerToken,body("2026-12",4,"1300","215")).andExpect(status().isCreated());
        jdbc.update("INSERT INTO invoice_payments(invoice_id,owner_id,payment_code,bank,account_number,account_holder_name,amount,paid_at) SELECT id,?,?,'MB','12345678','Owner',total_amount,SYSUTCDATETIME() FROM rental_invoices WHERE id=?",owner.getId(),"ANCU"+UUID.randomUUID().toString().replace("-","").substring(0,24),Long.valueOf(paidId));
        for(var filter:List.of("PAID","UNPAID","DRAFT"))mvc.perform(get("/api/v1/owner/invoices").header("Authorization","Bearer "+ownerToken).param("filter",filter).param("size","1").param("propertyId",property.getId().toString())).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/owner/invoices").header("Authorization","Bearer "+ownerToken).param("filter","PAID")).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(paidId)).andExpect(jsonPath("$.items[0].status").value("SENT")).andExpect(jsonPath("$.items[0].paymentStatus").value("PAID"));
        mvc.perform(get("/api/v1/owner/invoices").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3));
        mvc.perform(get("/api/v1/owner/invoices").header("Authorization","Bearer "+token(otherOwner)).param("filter","PAID")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }
    @BeforeEach void fixture(){
        owner=account(AuthAccount.Role.OWNER);tenant=account(AuthAccount.Role.CUSTOMER);otherOwner=account(AuthAccount.Role.OWNER);otherTenant=account(AuthAccount.Role.CUSTOMER);
        property=new Property();property.setOwner(owner);property.setName("Billing test");property.setAddress("Test address");property.setCity("Test city");property.setDistrict("District");property.setWard("Ward");property.setApprovalStatus(Property.ApprovalStatus.APPROVED);property=properties.saveAndFlush(property);
        apartment=new Apartment();apartment.setProperty(property);apartment.setRoomNumber("TEST.101");apartment.setTitle("Billing test apartment");apartment.setDescription("Test");apartment.setAreaM2(new BigDecimal("30"));apartment.setAdvertisedMonthlyRent(new BigDecimal("9999999"));apartment.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);apartment.setAvailability(Apartment.Availability.OCCUPIED);apartment.setCreatedAt(java.time.Instant.now());apartment=apartments.saveAndFlush(apartment);
        contract=new RentalContract();contract.setApartment(apartment);contract.setCustomer(tenant);contract.setStatus(RentalContract.Status.ACTIVE);contract.setStartDate(LocalDate.of(2026,10,1));contract.setEndDate(LocalDate.of(2027,9,30));contract.setBaselineDate(contract.getStartDate());contract.setMonthlyRent(new BigDecimal("5000000"));contract.setElectricityUnitPrice(new BigDecimal("3500"));contract.setWaterUnitPrice(new BigDecimal("15000"));contract.setElectricityBaseline(new BigDecimal("1000"));contract.setWaterBaseline(new BigDecimal("200"));contract=contracts.saveAndFlush(contract);
        ownerToken=token(owner);tenantToken=token(tenant);
    }
    private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail("billing-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Billing test account");a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setContactVerified(true);a.setEmailVerified(true);a.setPasswordHash(encoder.encode("Billing-test!12345"));return accounts.saveAndFlush(a);}
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
        send(ownerToken,id,0).andExpect(status().isOk());assertEquals(1,notifications.countByInvoiceId(Long.valueOf(id)));
        mvc.perform(get("/api/v1/me/invoices").header("Authorization","Bearer "+tenantToken)).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(id));
    }
    @Test void waterPerPersonAndFeesAreSnapshottedFromContract()throws Exception {
        contract.setWaterBillingMode(com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.PER_PERSON);contract.setOccupantCount(2);contract.setWaterUnitPrice(new BigDecimal("50000"));contract.setInternetFee(new BigDecimal("100000"));contract.setGarbageFee(new BigDecimal("30000"));contracts.saveAndFlush(contract);
        String json=create(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isCreated()).andExpect(jsonPath("$.waterBillingMode").value("PER_PERSON")).andExpect(jsonPath("$.occupantCount").value(2)).andReturn().getResponse().getContentAsString();
        assertEquals(0,new BigDecimal(JsonPath.<String>read(json,"$.waterAmount")).compareTo(new BigDecimal("100000")));
        assertEquals(0,new BigDecimal(JsonPath.<String>read(json,"$.totalAmount")).compareTo(new BigDecimal("5650000")));
        contract.setWaterUnitPrice(new BigDecimal("90000"));contract.setInternetFee(BigDecimal.ZERO);contracts.saveAndFlush(contract);
        mvc.perform(get("/api/v1/invoices/"+JsonPath.<String>read(json,"$.id")).header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.internetFee").value("100000"));
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
        try{Callable<Integer> task=()->{gate.await();return send(ownerToken,id,0).andReturn().getResponse().getStatus();};var a=pool.submit(task);var b=pool.submit(task);gate.countDown();assertEquals(200,a.get(15,TimeUnit.SECONDS));assertEquals(200,b.get(15,TimeUnit.SECONDS));assertEquals(1,notifications.countByInvoiceId(Long.valueOf(id)));}
        finally{pool.shutdownNow();cleanupCommitted();}
    }
    @Test void concurrentCreatesCommitOnlyOneInvoiceForThePeriod()throws Exception{
        TestTransaction.flagForCommit();TestTransaction.end();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try{Callable<Integer> task=()->{gate.await();return create(ownerToken,body("2026-10",0,"1120","208")).andReturn().getResponse().getStatus();};var a=pool.submit(task);var b=pool.submit(task);gate.countDown();var statuses=new ArrayList<>(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS)));Collections.sort(statuses);assertEquals(List.of(201,409),statuses);assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM rental_invoices WHERE contract_id=?",Integer.class,contract.getId().toString()));}
        finally{pool.shutdownNow();cleanupCommitted();}
    }
    private ResultActions saveMeter(String token,String json)throws Exception{return mvc.perform(post("/api/v1/owner/contracts/"+contract.getId()+"/meter-readings").header("Authorization","Bearer "+token).contentType("application/json").content(json));}
    @Test void savedMetersSurviveReloadAndProtectScopeSequenceAndStaleEdits()throws Exception{
        String input=body("2026-10",0,"1120.25","208.50").replace(",\"dueDate\":\"2027-10-05\"","");
        saveMeter(token(otherOwner),input).andExpect(status().isNotFound());saveMeter(tenantToken,input).andExpect(status().isForbidden());
        saveMeter(ownerToken,input).andExpect(status().isOk()).andExpect(jsonPath("$.savedReading.electricityEndReading").value("1120.25")).andExpect(jsonPath("$.baselineVersion").value(1));
        mvc.perform(get("/api/v1/owner/contracts/"+contract.getId()+"/billing-context").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.savedReading.waterEndReading").value("208.50"));
        saveMeter(ownerToken,input).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        saveMeter(ownerToken,input.replace("2026-10","2026-11").replace("baselineVersion\":0","baselineVersion\":1")).andExpect(status().isConflict());
    }
    @Test void savingMeterRejectsDecreaseAndUsesOnlyThisPropertySettings()throws Exception{
        String input=body("2026-10",0,"999","208");saveMeter(ownerToken,input).andExpect(status().isBadRequest());
        input=body("2026-10",0,"1120","208").replace("baselineVersion\":0","applyPropertyRates\":true,\"settingsVersion\":0,\"baselineVersion\":0");
        saveMeter(ownerToken,input).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PROPERTY_SETTINGS_MISSING"));
        jdbc.update("INSERT INTO property_settings(property_id,electricity_unit_price,water_unit_price,internet_fee,garbage_fee,water_billing_mode,updated_at,updated_by,version) VALUES(?,4000,50000,100000,30000,'PER_PERSON',SYSUTCDATETIME(),?,0)",property.getId(),owner.getId());
        saveMeter(ownerToken,input).andExpect(status().isOk()).andExpect(jsonPath("$.electricityUnitPrice").value("4000.00")).andExpect(jsonPath("$.waterBillingMode").value("PER_PERSON")).andExpect(jsonPath("$.savedReading.waterEndReading").value("200")).andExpect(jsonPath("$.savedReading.propertyRates").value(true));
    }
    @Test void invoiceUsesSavedMetersAndFrozenSettingsWithoutRetyping()throws Exception{
        jdbc.update("INSERT INTO property_settings(property_id,electricity_unit_price,water_unit_price,internet_fee,garbage_fee,water_billing_mode,updated_at,updated_by,version) VALUES(?,4000,50000,100000,30000,'PER_PERSON',SYSUTCDATETIME(),?,0)",property.getId(),owner.getId());
        contract.setOccupantCount(2);contracts.saveAndFlush(contract);
        saveMeter(ownerToken,body("2026-10",0,"1120","200").replace("baselineVersion\":0","applyPropertyRates\":true,\"settingsVersion\":0,\"baselineVersion\":0")).andExpect(status().isOk());
        jdbc.update("UPDATE property_settings SET electricity_unit_price=9000,version=version+1 WHERE property_id=?",property.getId());
        saveMeter(ownerToken,body("2026-10",1,"1120","200").replace("baselineVersion\":1","keepSavedTariff\":true,\"baselineVersion\":1")).andExpect(status().isOk()).andExpect(jsonPath("$.electricityUnitPrice").value("4000.00"));
        create(ownerToken,body("2026-10",2,"1130","200")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SAVED_READING_MISMATCH"));
        String json=create(ownerToken,"{\"period\":\"2026-10\",\"baselineVersion\":2,\"useSavedReadings\":true,\"dueDate\":\"2026-11-05\"}").andExpect(status().isCreated()).andExpect(jsonPath("$.electricityEndReading").value("1120")).andExpect(jsonPath("$.electricityUnitPrice").value("4000.00")).andExpect(jsonPath("$.waterBillingMode").value("PER_PERSON")).andReturn().getResponse().getContentAsString();
        assertEquals(0,new BigDecimal(JsonPath.<String>read(json,"$.totalAmount")).compareTo(new BigDecimal("5710000")));
        String id=JsonPath.read(json,"$.id");send(ownerToken,id,0).andExpect(status().isOk());
        mvc.perform(get("/api/v1/owner/contracts/"+contract.getId()+"/billing-context").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.period").value("2026-11")).andExpect(jsonPath("$.electricityStartReading").value("1120")).andExpect(jsonPath("$.savedReading").isEmpty());
        mvc.perform(get("/api/v1/invoices/"+id).header("Authorization","Bearer "+tenantToken)).andExpect(status().isOk()).andExpect(jsonPath("$.electricityUnitPrice").value("4000.00"));
    }
    @Test void cannotCreateFromMissingSavedReadingsOrEditAfterInvoice()throws Exception{
        create(ownerToken,"{\"period\":\"2026-10\",\"baselineVersion\":0,\"useSavedReadings\":true,\"dueDate\":\"2026-11-05\"}").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("METER_READING_MISSING"));
        saveMeter(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isOk());
        create(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        create(ownerToken,body("2026-10",1,"1120","208")).andExpect(status().isCreated());
        saveMeter(ownerToken,body("2026-10",2,"1130","208")).andExpect(status().isConflict());
    }
    @Test void previewIncludesMeteredChargesAndMatchesCreatedMonthlyInvoice()throws Exception{
        var preview=saveMeter(ownerToken,body("2026-10",0,"1120","208")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(0,new BigDecimal(JsonPath.<String>read(preview,"$.estimate.electricityAmount")).compareTo(new BigDecimal("420000")));
        assertEquals(0,new BigDecimal(JsonPath.<String>read(preview,"$.estimate.waterAmount")).compareTo(new BigDecimal("120000")));
        var invoice=create(ownerToken,"{\"period\":\"2026-10\",\"baselineVersion\":1,\"useSavedReadings\":true,\"dueDate\":\"2026-11-05\"}").andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        for(String field:List.of("electricityQuantity","electricityAmount","waterQuantity","waterAmount","totalAmount"))assertEquals(0,new BigDecimal(JsonPath.<String>read(preview,"$.estimate."+field)).compareTo(new BigDecimal(JsonPath.<String>read(invoice,"$."+field))));
    }
    @Autowired com.ancu.proptech.repository.payment.InvoicePaymentRepository invoicePayments;
    @Test void cashSourceOnlyAcceptsPaidInvoicesAndCannotDuplicateOrCrossOwner()throws Exception{
        String id=createDraft();send(ownerToken,id,0).andExpect(status().isOk());
        String command="{\"type\":\"INVOICE\",\"id\":"+id+",\"transactionDate\":\"2026-11-04\",\"paymentMethod\":\"CASH\"}";
        mvc.perform(post("/api/v1/owner/cash-entries/from-source").header("Authorization","Bearer "+ownerToken).contentType("application/json").content(command)).andExpect(status().isConflict());
        var p=new com.ancu.proptech.model.payment.InvoicePayment();p.setInvoiceId(Long.valueOf(id));p.setOwnerId(owner.getId());p.setPaymentCode("CASH"+UUID.randomUUID().toString().replace("-","").substring(0,20));p.setBank("MB");p.setAccountNumber("12345678");p.setAccountHolderName("Test owner");p.setAmount(new BigDecimal("5540000"));p.setPaidAt(java.time.Instant.parse("2026-10-31T18:00:00Z"));invoicePayments.saveAndFlush(p);
        mvc.perform(get("/api/v1/owner/cash-entries/sources").param("month","2026-10").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/owner/cash-entries/sources").param("month","2026-11").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].suggestedDate").value("2026-11-01"));
        mvc.perform(post("/api/v1/owner/cash-entries/from-source").header("Authorization","Bearer "+token(otherOwner)).contentType("application/json").content(command)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/owner/cash-entries/from-source").header("Authorization","Bearer "+tenantToken).contentType("application/json").content(command)).andExpect(status().isForbidden());
        String result=mvc.perform(post("/api/v1/owner/cash-entries/from-source").header("Authorization","Bearer "+ownerToken).contentType("application/json").content(command)).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT")).andExpect(jsonPath("$.paymentMethod").value("BANK_TRANSFER")).andExpect(jsonPath("$.transactionDate").value("2026-11-01")).andExpect(jsonPath("$.sourceType").value("INVOICE")).andReturn().getResponse().getContentAsString();
        Number cashId=JsonPath.read(result,"$.id");
        mvc.perform(post("/api/v1/owner/cash-entries/from-source").header("Authorization","Bearer "+ownerToken).contentType("application/json").content(command)).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(cashId.intValue()));
        mvc.perform(get("/api/v1/owner/cash-entries/sources").param("month","2026-11").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM cash_entries WHERE source_invoice_id=?",Integer.class,id));
    }
    private void cleanupCommitted(){
        String cid=contract.getId().toString(),aid=apartment.getId().toString();
        jdbc.update("DELETE FROM invoice_notifications WHERE invoice_id IN(SELECT id FROM rental_invoices WHERE contract_id=?)",cid);jdbc.update("DELETE FROM rental_invoices WHERE contract_id=?",cid);jdbc.update("DELETE FROM rental_contracts WHERE id=?",cid);jdbc.update("DELETE FROM rental_apartment_amenities WHERE apartment_id=?",aid);jdbc.update("DELETE FROM rental_apartments WHERE id=?",aid);jdbc.update("DELETE FROM rental_properties WHERE id=?",property.getId().toString());
        for(var account:List.of(owner,tenant,otherOwner,otherTenant)){String id=account.getId().toString();jdbc.update("DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id=?)",id);jdbc.update("DELETE FROM auth_sessions WHERE account_id=?",id);jdbc.update("DELETE FROM auth_accounts WHERE id=?",id);}
    }
}
