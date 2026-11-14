package com.ancu.proptech.controller.owner;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.model.payment.*;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.repository.payment.*;
import com.ancu.proptech.service.auth.AuthService;
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
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class OwnerWorkspaceSummaryIntegrationTests {
    private static final String URL="/api/v1/owner/workspace-summary";
    private final LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;
    @Autowired RentalContractRepository contracts;
    @Autowired RentalInvoiceRepository invoices;
    @Autowired InvoicePaymentRepository payments;
    @Autowired TestPaymentRepository receipts;
    @Autowired AuthService auth;
    @Autowired PasswordEncoder encoder;
    private int nextPeriod;

    private AuthAccount account(AuthAccount.Role role) {
        var a=new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Summary test");
        a.setPasswordHash(encoder.encode("Test!12345678"));a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);return accounts.saveAndFlush(a);
    }
    private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Test!12345678").tokens().accessToken();}
    private Property property(AuthAccount owner){var p=new Property();p.setOwner(owner);p.setName("Tài sản test");p.setAddress("Test");p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);return properties.saveAndFlush(p);}
    private RentalContract contract(Property p,AuthAccount customer,LocalDate end,RentalContract.Status status){
        var a=new Apartment();a.setProperty(p);a.setRoomNumber("P"+com.ancu.proptech.support.TestIds.next());a.setTitle("Summary unit");a.setDescription("Test");a.setAreaM2(new BigDecimal("25"));a.setAdvertisedMonthlyRent(new BigDecimal("100000"));a.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);a.setAvailability(Apartment.Availability.OCCUPIED);a.setCreatedAt(Instant.now());apartments.saveAndFlush(a);
        var c=new RentalContract();c.setApartment(a);c.setCustomer(customer);c.setStatus(status);c.setStartDate(today.minusDays(30));c.setEndDate(end);c.setMonthlyRent(new BigDecimal("100000"));c.setElectricityUnitPrice(new BigDecimal("3500"));c.setWaterUnitPrice(new BigDecimal("15000"));return contracts.saveAndFlush(c);
    }
    private RentalInvoice invoice(RentalContract c,RentalInvoice.Status status){
        var i=new RentalInvoice();i.setContract(c);i.setPeriod(YearMonth.of(2020,1).plusMonths(nextPeriod++).toString());i.setDueDate(today.plusDays(5));i.setMonthlyRent(c.getMonthlyRent());
        i.setElectricityStartReading(BigDecimal.ZERO);i.setElectricityEndReading(BigDecimal.ZERO);i.setElectricityQuantity(BigDecimal.ZERO);i.setElectricityUnitPrice(c.getElectricityUnitPrice());i.setElectricityAmount(BigDecimal.ZERO);
        i.setWaterStartReading(BigDecimal.ZERO);i.setWaterEndReading(BigDecimal.ZERO);i.setWaterQuantity(BigDecimal.ZERO);i.setWaterUnitPrice(c.getWaterUnitPrice());i.setWaterAmount(BigDecimal.ZERO);i.setTotalAmount(c.getMonthlyRent());i.setStatus(status);i.setCreatedAt(Instant.now());if(status==RentalInvoice.Status.SENT)i.setSentAt(Instant.now());return invoices.saveAndFlush(i);
    }
    private InvoicePayment payment(RentalInvoice i,boolean paid){var p=new InvoicePayment();p.setInvoiceId(i.getId());p.setOwnerId(i.getContract().getApartment().getProperty().getOwner().getId());p.setPaymentCode("ANCU"+UUID.randomUUID().toString().replace("-","").substring(0,24));p.setBank("MB");p.setAccountNumber("12345678");p.setAccountHolderName("Test");p.setAmount(i.getTotalAmount());if(paid)p.setPaidAt(Instant.now());return payments.saveAndFlush(p);}
    private TestPayment receipt(RentalContract c,boolean paid){var p=new TestPayment();p.setOwnerId(c.getApartment().getProperty().getOwner().getId());p.setContractId(c.getId());p.setCustomerId(c.getCustomer().getId());p.setPaymentCode("TEST"+UUID.randomUUID().toString().replace("-","").substring(0,24));p.setBank("MB");p.setAccountNumber("12345678");p.setAccountHolderName("Test");p.setAmount(new BigDecimal("1000"));p.setCreatedAt(Instant.now());if(paid)p.setPaidAt(Instant.now());return receipts.saveAndFlush(p);}
    private ResultActions read(String token,Property property)throws Exception{var req=get(URL).header("Authorization",token);if(property!=null)req.param("propertyId",property.getId().toString());return mvc.perform(req).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));}

    @Test void unpaidCountsCoverAllPagesExcludePaidDraftAndWrongPartiesThenRefreshAfterPayment()throws Exception{
        var owner=account(AuthAccount.Role.OWNER);var customer=account(AuthAccount.Role.CUSTOMER);var other=account(AuthAccount.Role.OWNER);var p=property(owner);var second=property(owner);var c=contract(p,customer,today.plusDays(100),RentalContract.Status.ACTIVE);var c2=contract(second,customer,today.plusDays(100),RentalContract.Status.ACTIVE);
        var first=invoice(c,RentalInvoice.Status.SENT);var pending=payment(first,false);for(int n=0;n<20;n++)invoice(c,RentalInvoice.Status.SENT);
        payment(invoice(c,RentalInvoice.Status.SENT),true);invoice(c,RentalInvoice.Status.DRAFT);
        var extra=receipt(c,false);receipt(c,false);receipt(c,true);
        var wrongCustomer=receipt(c,false);wrongCustomer.setCustomerId(other.getId());receipts.saveAndFlush(wrongCustomer);
        var ownerOnly=receipt(c,false);ownerOnly.setCustomerId(null);ownerOnly.setContractId(null);receipts.saveAndFlush(ownerOnly);
        var wrongOwner=receipt(c,false);wrongOwner.setOwnerId(other.getId());receipts.saveAndFlush(wrongOwner);
        invoice(c2,RentalInvoice.Status.SENT);receipt(c2,false);var t=token(owner);
        read(t,p).andExpect(jsonPath("$.unpaidMonthlyInvoiceCount").value(21)).andExpect(jsonPath("$.unpaidAdditionalReceiptCount").value(2)).andExpect(jsonPath("$.unpaidCount").value(23));
        read(t,null).andExpect(jsonPath("$.unpaidCount").value(25));
        mvc.perform(get("/api/v1/owner/invoices").header("Authorization",t).param("filter","UNPAID").param("propertyId",p.getId().toString()).param("page","1").param("size","20")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(21)).andExpect(jsonPath("$.items.length()").value(1));
        pending.setPaidAt(Instant.now());payments.saveAndFlush(pending);extra.setPaidAt(Instant.now());receipts.saveAndFlush(extra);
        read(t,p).andExpect(jsonPath("$.unpaidMonthlyInvoiceCount").value(20)).andExpect(jsonPath("$.unpaidAdditionalReceiptCount").value(1)).andExpect(jsonPath("$.unpaidCount").value(21));
        read(token(other),null).andExpect(jsonPath("$.unpaidCount").value(0));
    }
    @Test void expiryBoundariesAndRenewalStatesAreCountedWithoutChangingContracts()throws Exception{
        var owner=account(AuthAccount.Role.OWNER);var tenant=account(AuthAccount.Role.CUSTOMER);var p=property(owner);
        contract(p,tenant,today,RentalContract.Status.ACTIVE);contract(p,tenant,today.plusDays(20),RentalContract.Status.ACTIVE);contract(p,tenant,today.plusDays(21),RentalContract.Status.ACTIVE);contract(p,tenant,today.minusDays(1),RentalContract.Status.ACTIVE);
        contract(p,tenant,today.plusDays(1),RentalContract.Status.ENDED);contract(p,tenant,today.plusDays(1),RentalContract.Status.DRAFT);
        var notStarted=contract(p,tenant,today.plusDays(10),RentalContract.Status.ACTIVE);notStarted.setStartDate(today.plusDays(1));contracts.saveAndFlush(notStarted);
        var previous=contract(p,tenant,today.plusDays(5),RentalContract.Status.ACTIVE);var renewal=contract(p,tenant,today.plusDays(20),RentalContract.Status.DRAFT);renewal.setRenewalOfContractId(previous.getId());renewal.setStartDate(today.plusDays(6));contracts.saveAndFlush(renewal);
        var ended=contract(p,tenant,today.minusDays(1),RentalContract.Status.ENDED);var activeNext=contract(p,tenant,today.plusDays(365),RentalContract.Status.ACTIVE);activeNext.setRenewalOfContractId(ended.getId());activeNext.setStartDate(today);contracts.saveAndFlush(activeNext);
        read(token(owner),p).andExpect(jsonPath("$.asOf").value(today.toString())).andExpect(jsonPath("$.expiringThrough").value(today.plusDays(20).toString())).andExpect(jsonPath("$.expiringContractCount").value(3)).andExpect(jsonPath("$.expiredContractCount").value(1));
        org.junit.jupiter.api.Assertions.assertEquals(RentalContract.Status.ACTIVE,contracts.findById(previous.getId()).orElseThrow().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(RentalContract.Status.DRAFT,contracts.findById(renewal.getId()).orElseThrow().getStatus());
    }
    @Test void roleAndPropertyIsolationRejectUnknownOrForeignScopes()throws Exception{
        var owner=account(AuthAccount.Role.OWNER);var other=account(AuthAccount.Role.OWNER);var tenant=account(AuthAccount.Role.CUSTOMER);var foreign=property(other);var t=token(owner);
        read(t,null).andExpect(jsonPath("$.unpaidCount").value(0)).andExpect(jsonPath("$.expiringContractCount").value(0)).andExpect(jsonPath("$.expiredContractCount").value(0));
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());mvc.perform(get(URL).header("Authorization",token(tenant))).andExpect(status().isForbidden());
        mvc.perform(get(URL).header("Authorization",t).param("propertyId",foreign.getId().toString())).andExpect(status().isNotFound());
        mvc.perform(get(URL).header("Authorization",t).param("propertyId","999999999")).andExpect(status().isNotFound());
        mvc.perform(get(URL).header("Authorization",t).param("propertyId","bad-id")).andExpect(status().isBadRequest());
    }
}
