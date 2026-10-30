package com.ancu.proptech.controller.notification;
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
class NotificationIntegrationTests {
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
    private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail("billing-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Billing test account");a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setContactVerified(true);a.setEmailVerified(true);a.setPasswordHash(encoder.encode("Billing-test!12345"));return accounts.saveAndFlush(a);}
    private String token(AuthAccount a){return auth.login(a.getEmail(),"Billing-test!12345").tokens().accessToken();}

    private String sentInvoice(String period,long version)throws Exception {
      String body="{\"period\":\""+period+"\",\"dueDate\":\""+period+"-28\",\"electricityEndReading\":\"1000\",\"waterEndReading\":\"200\",\"baselineVersion\":"+version+"}";
      String json=mvc.perform(post("/api/v1/owner/contracts/"+contract.getId()+"/invoices").header("Authorization","Bearer "+ownerToken).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();String id=JsonPath.read(json,"$.id");
      mvc.perform(post("/api/v1/owner/invoices/"+id+"/send").header("Authorization","Bearer "+ownerToken).contentType("application/json").content("{\"version\":0}")).andExpect(status().isOk());return id;
    }
    private String feed(String token)throws Exception {return mvc.perform(get("/api/v1/me/notifications").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsString();}
    @Test void realInvoiceNotificationsArePrivateAndReadStatePersists()throws Exception {
      mvc.perform(get("/api/v1/me/notifications")).andExpect(status().isUnauthorized());
      assertEquals(0,JsonPath.<Integer>read(feed(tenantToken),"$.unreadCount"));String invoiceId=sentInvoice("2026-10",0);
      String json=feed(tenantToken);assertEquals(1,JsonPath.<Integer>read(json,"$.unreadCount"));assertEquals("/my/invoices/"+invoiceId,JsonPath.read(json,"$.items[0].url"));String id=JsonPath.read(json,"$.items[0].id");
      assertEquals(0,JsonPath.<Integer>read(feed(token(otherTenant)),"$.totalElements"));
      mvc.perform(post("/api/v1/me/notifications/"+id+"/read").header("Authorization","Bearer "+token(otherTenant))).andExpect(status().isNotFound());
      for(int i=0;i<2;i++)mvc.perform(post("/api/v1/me/notifications/"+id+"/read").header("Authorization","Bearer "+tenantToken)).andExpect(status().isNoContent());
      assertEquals(0,JsonPath.<Integer>read(feed(tenantToken),"$.unreadCount"));assertEquals(true,JsonPath.read(feed(tenantToken),"$.items[0].read"));
      mvc.perform(get("/api/v1/me/notifications?size=0").header("Authorization","Bearer "+tenantToken)).andExpect(status().isBadRequest());
    }
    @Test void readAllDoesNotSwallowNewNotificationsAndCountsAcrossPages()throws Exception {
      sentInvoice("2026-10",0);String before=feed(tenantToken);String through=JsonPath.read(before,"$.snapshotAt");sentInvoice("2026-11",2);
      mvc.perform(post("/api/v1/me/notifications/read-all").header("Authorization","Bearer "+tenantToken).contentType("application/json").content("{\"through\":\""+through+"\"}")).andExpect(status().isNoContent());
      mvc.perform(get("/api/v1/me/notifications?size=1").header("Authorization","Bearer "+tenantToken)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.unreadCount").value(1));
      mvc.perform(post("/api/v1/me/notifications/read-all").header("Authorization","Bearer "+tenantToken).contentType("application/json").content("{\"through\":\"2099-01-01T00:00:00Z\"}")).andExpect(status().isBadRequest());
    }
    @Test void rentalRequestIsVisibleToOnlyTheCorrectOwner()throws Exception {
      jdbc.update("INSERT INTO rental_requests(apartment_id,customer_id,message,status,created_at,version) VALUES(?,?,N'Yêu cầu thuê kiểm thử','PENDING',SYSUTCDATETIME(),0)",apartment.getId(),tenant.getId());
      String json=feed(ownerToken);assertEquals(1,JsonPath.<Integer>read(json,"$.unreadCount"));assertEquals("Có yêu cầu thuê mới",JsonPath.read(json,"$.items[0].title"));assertEquals(0,JsonPath.<Integer>read(feed(token(otherOwner)),"$.totalElements"));
    }
}
