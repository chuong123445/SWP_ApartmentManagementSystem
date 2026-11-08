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
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.jayway.jsonpath.JsonPath;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class OwnerFinancialSummaryIntegrationTests {
    private static final String URL="/api/v1/owner/financial-summary";
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;@Autowired RentalContractRepository contracts;@Autowired RentalInvoiceRepository invoices;
    @Autowired InvoicePaymentRepository payments;@Autowired TestPaymentRepository receipts;@Autowired AuthService auth;@Autowired PasswordEncoder encoder;
    private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Finance test");a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setPasswordHash(encoder.encode("Test!12345678"));return accounts.saveAndFlush(a);}
    private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Test!12345678").tokens().accessToken();}
    private Property property(AuthAccount owner){var p=new Property();p.setOwner(owner);p.setName("Tài sản thử");p.setAddress("Test");p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);return properties.saveAndFlush(p);}
    private RentalContract contract(Property p,AuthAccount tenant){var a=new Apartment();a.setProperty(p);a.setRoomNumber("P"+com.ancu.proptech.support.TestIds.next());a.setTitle("Room");a.setDescription("Test");a.setAreaM2(new BigDecimal("25"));a.setAdvertisedMonthlyRent(new BigDecimal("1000000"));a.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);a.setAvailability(Apartment.Availability.OCCUPIED);a.setCreatedAt(Instant.now());apartments.saveAndFlush(a);var c=new RentalContract();c.setApartment(a);c.setCustomer(tenant);c.setStatus(RentalContract.Status.ACTIVE);c.setStartDate(LocalDate.of(2020,1,1));c.setEndDate(LocalDate.of(2028,12,31));c.setMonthlyRent(new BigDecimal("1000000"));c.setElectricityUnitPrice(BigDecimal.ONE);c.setWaterUnitPrice(BigDecimal.ONE);return contracts.saveAndFlush(c);}
    private RentalInvoice invoice(RentalContract c,String period,String rent,String electricity,LocalDate due,RentalInvoice.Status status){var i=new RentalInvoice();i.setContract(c);i.setPeriod(period);i.setDueDate(due);i.setMonthlyRent(new BigDecimal(rent));i.setElectricityStartReading(BigDecimal.ZERO);i.setElectricityEndReading(new BigDecimal(electricity));i.setElectricityQuantity(new BigDecimal(electricity));i.setElectricityUnitPrice(BigDecimal.ONE);i.setElectricityAmount(new BigDecimal(electricity));i.setWaterStartReading(BigDecimal.ZERO);i.setWaterEndReading(BigDecimal.ZERO);i.setWaterQuantity(BigDecimal.ZERO);i.setWaterUnitPrice(BigDecimal.ONE);i.setWaterAmount(BigDecimal.ZERO);i.setTotalAmount(i.getMonthlyRent().add(i.getElectricityAmount()));i.setStatus(status);i.setCreatedAt(Instant.now());if(status==RentalInvoice.Status.SENT)i.setSentAt(Instant.now());return invoices.saveAndFlush(i);}
    private void paid(RentalInvoice i,String instant){var p=new InvoicePayment();p.setInvoiceId(i.getId());p.setOwnerId(i.getContract().getApartment().getProperty().getOwner().getId());p.setPaymentCode("ANCU"+UUID.randomUUID().toString().replace("-","").substring(0,24));p.setBank("MB");p.setAccountNumber("12345678");p.setAccountHolderName("Test");p.setAmount(i.getTotalAmount());p.setPaidAt(Instant.parse(instant));payments.saveAndFlush(p);}
    private TestPayment receipt(RentalContract c,String amount,String paidAt){var r=new TestPayment();r.setOwnerId(c.getApartment().getProperty().getOwner().getId());r.setCustomerId(c.getCustomer().getId());r.setContractId(c.getId());r.setAmount(new BigDecimal(amount));r.setPaymentCode("TEST"+UUID.randomUUID().toString().replace("-","").substring(0,24));r.setBank("MB");r.setAccountNumber("12345678");r.setAccountHolderName("Test");r.setCreatedAt(paidAt==null?Instant.now():Instant.parse(paidAt).minusSeconds(86400));if(paidAt!=null)r.setPaidAt(Instant.parse(paidAt));return receipts.saveAndFlush(r);}
    private String read(String token,Property p,int year)throws Exception{var req=get(URL).header("Authorization",token).param("year",String.valueOf(year));if(p!=null)req.param("propertyId",p.getId().toString());return mvc.perform(req).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsString();}
    private static void money(String json,String path,String expected){assertEquals(0,new BigDecimal(expected).compareTo(new BigDecimal(JsonPath.<String>read(json,path))),path);}
    @Test void allInvoicesAcrossPagesAndYearsAreScopedAndMoneyStaysExact()throws Exception{
        var owner=account(AuthAccount.Role.OWNER);var tenant=account(AuthAccount.Role.CUSTOMER);var other=account(AuthAccount.Role.OWNER);var p=property(owner);var second=property(owner);var empty=property(owner);RentalContract first=null;
        for(int n=0;n<21;n++){var c=contract(p,tenant);if(first==null)first=c;var i=invoice(c,"2026-11","1000000","0.125",LocalDate.of(2026,11,30),RentalInvoice.Status.SENT);if(n==0)paid(i,"2026-11-05T10:00:00Z");}
        paid(invoice(first,"2025-12","9000000","0",LocalDate.of(2025,12,31),RentalInvoice.Status.SENT),"2026-01-02T00:00:00Z");
        invoice(first,"2027-01","7000000","0",LocalDate.of(2027,1,31),RentalInvoice.Status.SENT);invoice(first,"2026-12","99000000","0",LocalDate.of(2026,12,31),RentalInvoice.Status.DRAFT);
        invoice(contract(second,tenant),"2026-11","2000000","0",LocalDate.of(2026,11,30),RentalInvoice.Status.SENT);
        invoice(contract(property(other),tenant),"2026-11","8000000","0",LocalDate.of(2026,11,30),RentalInvoice.Status.SENT);
        receipt(first,"1234","2026-01-01T00:00:00Z");receipt(first,"1000",null);
        var wrong=receipt(first,"9999","2026-01-01T00:00:00Z");wrong.setCustomerId(other.getId());receipts.saveAndFlush(wrong);
        var legacy=receipt(first,"9999","2026-01-01T00:00:00Z");legacy.setCustomerId(null);legacy.setContractId(null);receipts.saveAndFlush(legacy);
        String t=token(owner),json=read(t,p,2026);assertEquals(21,JsonPath.<Number>read(json,"$.totals.invoiceCount").intValue());
        money(json,"$.totals.billedAmount","21000002.625");money(json,"$.totals.paidInvoiceAmount","1000000.125");money(json,"$.totals.unpaidInvoiceAmount","20000002.5");
        money(json,"$.receipts.monthlyInvoiceAmount","10000000.125");money(json,"$.receipts.additionalAmount","1234");money(json,"$.receipts.totalAmount","10001234.125");money(json,"$.arrears.additionalAmount","1000");
        money(json,"$.months[10].invoices.billedAmount","21000002.625");money(json,"$.months[0].receipts.monthlyInvoiceAmount","9000000");
        assertEquals(12,JsonPath.<List<?>>read(json,"$.months").size());assertEquals(21,JsonPath.<Number>read(json,"$.inventory.units").intValue());
        money(read(t,null,2026),"$.totals.billedAmount","23000002.625");money(read(t,p,2025),"$.totals.billedAmount","9000000");
        String zero=read(t,empty,2026);money(zero,"$.totals.billedAmount","0");assertEquals(0,JsonPath.<Number>read(zero,"$.inventory.units").intValue());assertEquals(1,JsonPath.<List<?>>read(zero,"$.properties").size());
        money(read(token(other),null,2026),"$.totals.billedAmount","8000000");assertFalse(json.contains("snapshot"));assertFalse(json.contains("accountNumber"));
    }
    @Test void calendarYearUsesVietnamPaidDateAndOnTimeAndOverdueAreIndependent()throws Exception{
        var owner=account(AuthAccount.Role.OWNER);var tenant=account(AuthAccount.Role.CUSTOMER);var p=property(owner);var c=contract(p,tenant);
        paid(invoice(c,"2025-11","10","0",LocalDate.of(2025,12,31),RentalInvoice.Status.SENT),"2025-12-31T16:59:59Z");
        paid(invoice(c,"2025-12","10","0",LocalDate.of(2025,12,31),RentalInvoice.Status.SENT),"2025-12-31T17:00:00Z");
        paid(invoice(c,"2024-12","30","0",LocalDate.of(2024,12,31),RentalInvoice.Status.SENT),"2024-12-31T17:00:00Z");
        var today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));invoice(c,"2026-01","10","0",today.minusDays(1),RentalInvoice.Status.SENT);invoice(c,"2026-02","10","0",today,RentalInvoice.Status.SENT);invoice(c,"2026-03","10","0",today.plusDays(1),RentalInvoice.Status.SENT);
        String json=read(token(owner),p,2025);money(json,"$.totals.billedAmount","20");money(json,"$.totals.paidInvoiceAmount","20");money(json,"$.receipts.monthlyInvoiceAmount","40");
        assertEquals(2,JsonPath.<Number>read(json,"$.totals.paidInvoiceCount").intValue());assertEquals(1,JsonPath.<Number>read(json,"$.totals.onTimePaidInvoiceCount").intValue());
        assertEquals(1,JsonPath.<Number>read(json,"$.arrears.overdueInvoiceCount").intValue());money(json,"$.arrears.monthlyInvoiceAmount","30");money(json,"$.arrears.overdueInvoiceAmount","10");
        money(json,"$.months[0].receipts.monthlyInvoiceAmount","30");money(json,"$.months[11].receipts.monthlyInvoiceAmount","10");
    }
    @Test void yearAndOwnerPropertyAccessAreValidated()throws Exception{
        var owner=account(AuthAccount.Role.OWNER);var other=account(AuthAccount.Role.OWNER);var p=property(other);var t=token(owner);
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());mvc.perform(get(URL).header("Authorization",token(account(AuthAccount.Role.CUSTOMER)))).andExpect(status().isForbidden());
        mvc.perform(get(URL).header("Authorization",t).param("propertyId",p.getId().toString())).andExpect(status().isNotFound());
        for(String year:List.of("1899","9999","bad"))mvc.perform(get(URL).header("Authorization",t).param("year",year)).andExpect(status().isBadRequest());
        var current=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));mvc.perform(get(URL).header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.year").value(current.getYear())).andExpect(jsonPath("$.asOf").value(current.toString()));
    }
}
