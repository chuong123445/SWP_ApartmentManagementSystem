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
@SpringBootTest(properties={"app.seed.enabled=false","app.billing.local-fixtures=false","app.payment.public-base-url=https://payments.example.invalid"}) @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class SepayIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;@Autowired RentalContractRepository contracts;
    @Autowired InvoiceNotificationRepository notifications;@Autowired AuthService auth;@Autowired PasswordEncoder encoder;@Autowired JdbcTemplate jdbc;
    private AuthAccount owner,tenant,otherOwner,otherTenant;private Property property;private Apartment apartment;private RentalContract contract;private String ownerToken,tenantToken;
    @org.springframework.test.context.bean.override.mockito.MockitoBean com.ancu.proptech.service.payment.SepayBankClient bankClient;
    @Autowired com.ancu.proptech.repository.payment.SepayConnectionRepository connections;
    @Autowired com.ancu.proptech.repository.payment.InvoicePaymentRepository payments;
    @Autowired com.ancu.proptech.repository.payment.SepayEventRepository events;
    private String key;
    @BeforeEach void fixture(){
        org.mockito.Mockito.when(bankClient.bank(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.eq("bank1"))).thenReturn(new com.ancu.proptech.dto.payment.SepayDtos.BankAccount("bank1","BIDV","970418","1234567890","NGUYEN VAN A","personal"));
        org.mockito.Mockito.when(bankClient.va(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.eq("bank1"),org.mockito.ArgumentMatchers.eq("va1"))).thenReturn(new com.ancu.proptech.dto.payment.SepayDtos.VirtualAccount("va1","96247123456789","NGUYEN VAN A"));
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

    String setup(String token,String bank,String va,long version)throws Exception{
        return mvc.perform(put("/api/v1/owner/payments/sepay").header("Authorization","Bearer "+token).contentType("application/json").content("{\"apiToken\":\"test-provider-token\",\"bankAccountId\":\""+bank+"\",\"virtualAccountId\":"+(va==null?"null":"\""+va+"\"")+",\"enabled\":true,\"version\":"+version+"}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }
    String prepare()throws Exception{
        key=JsonPath.read(setup(ownerToken,"bank1","va1",0),"$.webhookSecret");String id=createDraft();send(ownerToken,id,0).andExpect(status().isOk());return id;
    }
    String ticket(String token,String id)throws Exception{return mvc.perform(post("/api/v1/invoices/"+id+"/payment").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();}
    String webhook(long id,String code,String amount,String account,String sub,String direction){return "{\"id\":"+id+",\"gateway\":\"BIDV\",\"accountNumber\":\""+account+"\",\"subAccount\":\""+sub+"\",\"code\":null,\"content\":\"THANH TOAN "+code+"\",\"transferType\":\""+direction+"\",\"transferAmount\":"+amount+"}";}
    ResultActions deliver(String secret,String body)throws Exception{return mvc.perform(post("/api/v1/payments/sepay/webhooks/"+owner.getId()).header("Authorization","Apikey "+secret).contentType("application/json").content(body));}
    @Test void configIsPrivateSecretIsOneTimeAndBankDataComesFromProvider()throws Exception{
        String result=setup(ownerToken,"bank1","va1",0);String secret=JsonPath.read(result,"$.webhookSecret");assertNotNull(secret);assertFalse(connections.findByOwnerId(owner.getId()).orElseThrow().getSecretHash().equals(secret));
        mvc.perform(get("/api/v1/owner/payments/sepay").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.webhookSecret").isEmpty()).andExpect(jsonPath("$.webhookUrl").value("https://payments.example.invalid/api/v1/payments/sepay/webhooks/"+owner.getId())).andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(get("/api/v1/owner/payments/sepay").header("Authorization","Bearer "+token(otherOwner))).andExpect(jsonPath("$.configured").value(false));
        mvc.perform(get("/api/v1/owner/payments/sepay").header("Authorization","Bearer "+tenantToken)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/owner/payments/sepay").header("Authorization","Bearer "+ownerToken).contentType("application/json").content("{\"apiToken\":\"test-provider-token\",\"bankAccountId\":\"bank1\",\"enabled\":true,\"version\":0}")).andExpect(status().isBadRequest());
    }
    @Test void qrUsesVaExactServerAmountAndIdempotentCode()throws Exception{
        String id=prepare();String response=ticket(tenantToken,id);assertTrue(JsonPath.<String>read(response,"$.qrUrl").contains("acc=96247123456789"));assertTrue(JsonPath.<String>read(response,"$.qrUrl").contains("amount=5540000"));assertEquals(JsonPath.<String>read(response,"$.paymentCode"),JsonPath.<String>read(ticket(ownerToken,id),"$.paymentCode"));
        mvc.perform(post("/api/v1/invoices/"+id+"/payment").header("Authorization","Bearer "+token(otherTenant))).andExpect(status().isNotFound());
    }
    @Test void correctWebhookPaysOnceAndPreservesSentBillingChain()throws Exception{
        String id=prepare();String code=JsonPath.read(ticket(tenantToken,id),"$.paymentCode");String body=webhook(80001,code,"5540000","1234567890","96247123456789","in");
        deliver(key,body).andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));deliver(key,body).andExpect(status().isOk());assertEquals(1,events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(owner.getId()).size());assertNotNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());
        mvc.perform(get("/api/v1/invoices/"+id).header("Authorization","Bearer "+tenantToken)).andExpect(jsonPath("$.status").value("SENT")).andExpect(jsonPath("$.paymentStatus").value("PAID"));
        mvc.perform(get("/api/v1/owner/contracts/"+contract.getId()+"/billing-context").header("Authorization","Bearer "+ownerToken)).andExpect(jsonPath("$.period").value("2026-11"));
        assertNull(JsonPath.read(ticket(tenantToken,id),"$.qrUrl"));
    }
    @Test void badKeyWrongAccountAmountsOutgoingAndAmbiguousCodesNeverPay()throws Exception{
        String id=prepare();String code=JsonPath.read(ticket(tenantToken,id),"$.paymentCode");deliver("bad-key",webhook(81000,code,"5540000","1234567890","96247123456789","in")).andExpect(status().isUnauthorized());
        String[] bodies={webhook(81001,code,"5540001","1234567890","96247123456789","in"),webhook(81002,code,"1","1234567890","96247123456789","in"),webhook(81003,code,"5540000","1234567890","wrong","in"),webhook(81004,code,"5540000","1234567890","96247123456789","out"),webhook(81005,code+" ANCU111111111111111111111111","5540000","1234567890","96247123456789","in")};
        for(String body:bodies)deliver(key,body).andExpect(status().isOk());assertNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());assertEquals(5,events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(owner.getId()).size());
        mvc.perform(get("/api/v1/owner/payments/sepay/events").header("Authorization","Bearer "+token(otherOwner))).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void rotationRevokesOldKeyAndStaleRotationFails()throws Exception{
        String id=prepare();var c=connections.findByOwnerId(owner.getId()).orElseThrow();long version=c.getVersion();String body="{\"version\":"+version+"}";
        var result=mvc.perform(post("/api/v1/owner/payments/sepay/rotate-key").header("Authorization","Bearer "+ownerToken).contentType("application/json").content(body)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();String next=JsonPath.read(result,"$.webhookSecret");assertNotEquals(key,next);
        mvc.perform(post("/api/v1/owner/payments/sepay/rotate-key").header("Authorization","Bearer "+ownerToken).contentType("application/json").content(body)).andExpect(status().isConflict());deliver(key,webhook(82001,"TEST","1","1234567890","96247123456789","in")).andExpect(status().isUnauthorized());deliver(next,webhook(82001,"TEST","1","1234567890","96247123456789","in")).andExpect(status().isOk());
    }
    @Test void ordinaryBankUsesOriginalAccountAndBankRulesAddVietinbankPrefix()throws Exception{
        org.mockito.Mockito.when(bankClient.bank(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.eq("bank2"))).thenReturn(new com.ancu.proptech.dto.payment.SepayDtos.BankAccount("bank2","VietinBank","970415","8888777766","LE THI B","personal"));
        setup(ownerToken,"bank2",null,0);String id=createDraft();send(ownerToken,id,0).andExpect(status().isOk());String qr=JsonPath.read(ticket(tenantToken,id),"$.qrUrl");assertTrue(qr.contains("bank=VietinBank"));assertTrue(qr.contains("acc=8888777766"));assertTrue(qr.contains("SEVQR%20"));
    }
    @Test void draftInvoicesNeverHavePaymentQrAndFractionalVndIsNotRounded()throws Exception{
        setup(ownerToken,"bank1","va1",0);String id=createDraft();mvc.perform(post("/api/v1/invoices/"+id+"/payment").header("Authorization","Bearer "+ownerToken)).andExpect(status().isConflict());
        send(ownerToken,id,0).andExpect(status().isOk());jdbc.update("UPDATE rental_invoices SET total_amount=5540000.5 WHERE id=?",id);
        // Làm mới entity khỏi persistence context của test sau sửa SQL trực tiếp.
        entityManager.clear();mvc.perform(post("/api/v1/invoices/"+id+"/payment").header("Authorization","Bearer "+tenantToken)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FRACTIONAL_VND_UNSUPPORTED"));
    }

    @Test void changingBankKeepsExistingInvoiceRecipientSnapshot()throws Exception{
        String id=prepare();String before=ticket(tenantToken,id);String code=JsonPath.read(before,"$.paymentCode");
        org.mockito.Mockito.when(bankClient.bank(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.eq("bank2"))).thenReturn(new com.ancu.proptech.dto.payment.SepayDtos.BankAccount("bank2","Vietcombank","970436","9999888877","LE THI B","personal"));
        setup(ownerToken,"bank2",null,connections.findByOwnerId(owner.getId()).orElseThrow().getVersion());assertEquals(JsonPath.<String>read(before,"$.qrUrl"),JsonPath.<String>read(ticket(tenantToken,id),"$.qrUrl"));
        deliver(key,webhook(84001,code,"5540000","1234567890","96247123456789","in")).andExpect(status().isOk());assertNotNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());
    }
    @Test void disabledConnectionStopsNewQrAndNeverSettlesWebhook()throws Exception{
        String id=prepare();String code=JsonPath.read(ticket(tenantToken,id),"$.paymentCode");long version=connections.findByOwnerId(owner.getId()).orElseThrow().getVersion();
        org.mockito.Mockito.clearInvocations(bankClient);mvc.perform(patch("/api/v1/owner/payments/sepay/status").header("Authorization","Bearer "+ownerToken).contentType("application/json").content("{\"enabled\":false,\"version\":"+version+"}")).andExpect(status().isOk());org.mockito.Mockito.verifyNoInteractions(bankClient);
        mvc.perform(get("/api/v1/invoices/"+id+"/payment").header("Authorization","Bearer "+tenantToken)).andExpect(jsonPath("$.status").value("NOT_CONFIGURED"));
        deliver(key,webhook(85001,code,"5540000","1234567890","96247123456789","in")).andExpect(status().isOk());assertNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());
    }

    @Test void anotherOwnersUnmatchedWebhookNeverConsumesTheRightOwnersTransaction()throws Exception{
        String id=prepare();String code=JsonPath.read(ticket(tenantToken,id),"$.paymentCode");String otherKey=JsonPath.read(setup(token(otherOwner),"bank1","va1",0),"$.webhookSecret");String body=webhook(86001,code,"5540000","1234567890","96247123456789","in");
        mvc.perform(post("/api/v1/payments/sepay/webhooks/"+otherOwner.getId()).header("Authorization","Apikey "+otherKey).contentType("application/json").content(body)).andExpect(status().isOk());assertNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());
        deliver(key,body).andExpect(status().isOk());assertNotNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());assertEquals("UNMATCHED",events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(otherOwner.getId()).get(0).getResult());
    }

    @Test void zeroIdProviderTestAcknowledgesConnectionWithoutPayingEvenMatchingInvoice()throws Exception{
        String id=prepare();String code=JsonPath.read(ticket(tenantToken,id),"$.paymentCode");String body=webhook(0,code,"5540000","1234567890","96247123456789","in");
        deliver(key,body).andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));deliver(key,body).andExpect(status().isOk());
        assertNotNull(connections.findByOwnerId(owner.getId()).orElseThrow().getLastWebhookAt());assertTrue(events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(owner.getId()).isEmpty());assertNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());
        mvc.perform(get("/api/v1/invoices/"+id).header("Authorization","Bearer "+tenantToken)).andExpect(jsonPath("$.paymentStatus").value("UNPAID"));
    }
    @Test void zeroIdTestStillRequiresCorrectKeyAndNegativeIdIsInvalid()throws Exception{
        prepare();deliver("wrong-key",webhook(0,"TEST","1","1234567890","96247123456789","in")).andExpect(status().isUnauthorized());
        deliver(key,webhook(-1,"TEST","1","1234567890","96247123456789","in")).andExpect(status().isBadRequest());assertNull(connections.findByOwnerId(owner.getId()).orElseThrow().getLastWebhookAt());assertTrue(events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(owner.getId()).isEmpty());
    }
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Test void concurrentWebhookRetriesCommitOnePaymentEvent()throws Exception{
        String id=prepare();String code=JsonPath.read(ticket(tenantToken,id),"$.paymentCode");String body=webhook(83001,code,"5540000","1234567890","96247123456789","in");TestTransaction.flagForCommit();TestTransaction.end();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try{Callable<Integer> task=()->{gate.await();return deliver(key,body).andReturn().getResponse().getStatus();};var a=pool.submit(task);var b=pool.submit(task);gate.countDown();assertEquals(200,a.get(15,TimeUnit.SECONDS));assertEquals(200,b.get(15,TimeUnit.SECONDS));assertEquals(1,events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(owner.getId()).size());assertNotNull(payments.findByInvoiceId(Long.valueOf(id)).orElseThrow().getPaidAt());}
        finally{pool.shutdownNow();cleanupCommitted();}
    }
    private void cleanupCommitted(){
        String cid=contract.getId().toString(),aid=apartment.getId().toString();
        jdbc.update("DELETE FROM sepay_events WHERE owner_id=?",owner.getId());jdbc.update("DELETE FROM invoice_payments WHERE owner_id=?",owner.getId());jdbc.update("DELETE FROM sepay_connections WHERE owner_id=?",owner.getId());
        jdbc.update("DELETE FROM invoice_notifications WHERE invoice_id IN(SELECT id FROM rental_invoices WHERE contract_id=?)",cid);jdbc.update("DELETE FROM rental_invoices WHERE contract_id=?",cid);jdbc.update("DELETE FROM rental_contracts WHERE id=?",cid);jdbc.update("DELETE FROM rental_apartment_amenities WHERE apartment_id=?",aid);jdbc.update("DELETE FROM rental_apartments WHERE id=?",aid);jdbc.update("DELETE FROM rental_properties WHERE id=?",property.getId().toString());
        for(var account:List.of(owner,tenant,otherOwner,otherTenant)){String id=account.getId().toString();jdbc.update("DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id=?)",id);jdbc.update("DELETE FROM auth_sessions WHERE account_id=?",id);jdbc.update("DELETE FROM auth_accounts WHERE id=?",id);}
    }
}
