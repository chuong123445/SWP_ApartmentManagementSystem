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

    @Test void ownerDecisionProducesRealCustomerNotificationWithDecisionTimestamp()throws Exception {
      jdbc.update("INSERT INTO rental_requests(apartment_id,customer_id,message,status,created_at,version) VALUES(?,?,N'Yêu cầu kiểm thử','PENDING',SYSUTCDATETIME(),0)",apartment.getId(),tenant.getId());
      Long id=jdbc.queryForObject("SELECT id FROM rental_requests WHERE apartment_id=? AND customer_id=?",Long.class,apartment.getId(),tenant.getId());
      mvc.perform(post("/api/v1/owner/rental-requests/"+id+"/decisions").header("Authorization","Bearer "+ownerToken).contentType("application/json").content("{\"decision\":\"REJECT\",\"version\":0,\"reason\":\"Không phù hợp\"}")).andExpect(status().isOk());
      assertNotNull(jdbc.queryForObject("SELECT decided_at FROM rental_requests WHERE id=?",java.sql.Timestamp.class,id));
      String json=feed(tenantToken);assertEquals(1,JsonPath.<Integer>read(json,"$.unreadCount"));assertEquals("/my/rental-requests",JsonPath.read(json,"$.items[0].url"));assertTrue(JsonPath.<String>read(json,"$.items[0].message").contains("Đã từ chối"));
    }
    @Test void maintenanceEventsNotifyOnlyTheOtherRelevantParty()throws Exception {
      jdbc.update("INSERT INTO maintenance_tickets(property_id,apartment_id,reporter_id,tenant_id,title,description,category,priority,status,created_at,version) VALUES(?,?,?,?,N'Sự cố kiểm thử',N'Nội dung','WATER','NORMAL','PENDING',SYSUTCDATETIME(),0)",property.getId(),apartment.getId(),tenant.getId(),tenant.getId());
      Long id=jdbc.queryForObject("SELECT id FROM maintenance_tickets WHERE property_id=?",Long.class,property.getId());
      jdbc.update("INSERT INTO maintenance_events(ticket_id,actor_id,action,note,created_at) VALUES(?,?,'CREATED',N'',SYSUTCDATETIME())",id,tenant.getId());
      assertEquals(1,JsonPath.<Integer>read(feed(ownerToken),"$.unreadCount"));assertEquals(0,JsonPath.<Integer>read(feed(tenantToken),"$.unreadCount"));assertEquals(0,JsonPath.<Integer>read(feed(token(otherOwner)),"$.unreadCount"));
      jdbc.update("INSERT INTO maintenance_events(ticket_id,actor_id,action,note,created_at) VALUES(?,?,'ACCEPT',N'',SYSUTCDATETIME())",id,owner.getId());
      assertEquals(1,JsonPath.<Integer>read(feed(tenantToken),"$.unreadCount"));assertEquals(1,JsonPath.<Integer>read(feed(ownerToken),"$.unreadCount"));
    }
    private void assertNotification(String recipient,String key,String title,String name)throws Exception{
      java.util.List<java.util.Map<String,Object>> items=JsonPath.read(feed(recipient),"$.items");
      var item=items.stream().filter(v->v.get("id").toString().equals(key)).findFirst().orElseThrow();
      assertEquals(title,item.get("title"));assertTrue(item.get("message").toString().contains(name));assertTrue(item.get("message").toString().contains("Lý do / nội dung: Kiểm thử"));
    }
    @Test void earlyTerminationNotificationsIdentifyActorAndYourProposalInBothDirections()throws Exception{
      for(boolean byOwner:java.util.List.of(true,false)){
        var actor=byOwner?owner:tenant;String role=byOwner?"Chủ nhà":"Người thuê",recipient=byOwner?tenantToken:ownerToken;
        for(String action:java.util.List.of("PROPOSE_TERMINATION","ACCEPT_TERMINATION","REJECT_TERMINATION","WITHDRAW_TERMINATION")){
          jdbc.update("INSERT INTO contract_exit_events(contract_id,actor_id,actor_name,action,reason,before_json,after_json,created_at) VALUES(?,?,?, ?,N'Kiểm thử',N'{}',N'{}',SYSUTCDATETIME())",contract.getId(),actor.getId(),role+" kiểm thử",action);
          Long id=jdbc.queryForObject("SELECT MAX(id) FROM contract_exit_events WHERE contract_id=?",Long.class,contract.getId());
          String title=role+switch(action){case "PROPOSE_TERMINATION"->" đề nghị kết thúc thuê sớm — cần bạn phản hồi";case "ACCEPT_TERMINATION"->" đã đồng ý đề nghị kết thúc thuê sớm của bạn";case "REJECT_TERMINATION"->" đã từ chối đề nghị kết thúc thuê sớm của bạn";default->" đã rút đề nghị kết thúc thuê sớm";};
          assertNotification(recipient,"contract-exit:"+id,title,role+" kiểm thử");
          // Updating labels must not replace the event identity or reset its read state.
          mvc.perform(post("/api/v1/me/notifications/contract-exit:"+id+"/read").header("Authorization","Bearer "+recipient)).andExpect(status().isNoContent());
          java.util.List<java.util.Map<String,Object>> rows=JsonPath.read(feed(recipient),"$.items");assertEquals(true,rows.stream().filter(v->v.get("id").equals("contract-exit:"+id)).findFirst().orElseThrow().get("read"));
        }
      }
      assertEquals(0,JsonPath.<Integer>read(feed(token(otherTenant)),"$.totalElements"));assertEquals(0,JsonPath.<Integer>read(feed(token(otherOwner)),"$.totalElements"));
    }
    @Test void preLeaseCancellationNotificationsIdentifyActorAndAutomaticTimeout()throws Exception{
      jdbc.update("INSERT INTO rental_requests(apartment_id,customer_id,message,status,created_at,version) VALUES(?,?,N'Kiểm thử','ACCEPTED',SYSUTCDATETIME(),0)",apartment.getId(),tenant.getId());
      Long request=jdbc.queryForObject("SELECT MAX(id) FROM rental_requests WHERE apartment_id=?",Long.class,apartment.getId());
      for(boolean byOwner:java.util.List.of(true,false)){
        var actor=byOwner?owner:tenant;String role=byOwner?"Chủ nhà":"Người thuê",recipient=byOwner?tenantToken:ownerToken;
        for(String action:java.util.List.of("PROPOSED","ACCEPTED","REJECTED","WITHDRAWN")){
          jdbc.update("INSERT INTO selection_cancellation_events(request_id,actor_id,actor_name,action,reason,before_json,after_json,created_at) VALUES(?,?,?, ?,N'Kiểm thử',N'{}',N'{}',SYSUTCDATETIME())",request,actor.getId(),role+" kiểm thử",action);
          Long id=jdbc.queryForObject("SELECT MAX(id) FROM selection_cancellation_events WHERE request_id=?",Long.class,request);
          String title=role+switch(action){case "PROPOSED"->" đề nghị hủy quá trình làm hợp đồng — cần bạn phản hồi";case "ACCEPTED"->" đã đồng ý đề nghị hủy làm hợp đồng của bạn";case "REJECTED"->" đã từ chối đề nghị hủy làm hợp đồng của bạn";default->" đã rút đề nghị hủy quá trình làm hợp đồng";};
          assertNotification(recipient,"selection-cancel:"+id,title,role+" kiểm thử");
        }
      }
      jdbc.update("INSERT INTO selection_cancellation_events(request_id,actor_id,actor_name,action,reason,before_json,after_json,created_at) VALUES(?,0,N'Hệ thống','AUTO_ACCEPTED',N'Kiểm thử',N'{}',N'{}',SYSUTCDATETIME())",request);
      Long id=jdbc.queryForObject("SELECT MAX(id) FROM selection_cancellation_events WHERE request_id=?",Long.class,request);
      for(String recipient:java.util.List.of(ownerToken,tenantToken))assertNotification(recipient,"selection-cancel:"+id,"Đề nghị hủy làm hợp đồng được tự chấp thuận sau 3 ngày không phản hồi","Hệ thống");
      assertEquals(0,JsonPath.<Integer>read(feed(token(otherTenant)),"$.totalElements"));assertEquals(0,JsonPath.<Integer>read(feed(token(otherOwner)),"$.totalElements"));
    }

}
