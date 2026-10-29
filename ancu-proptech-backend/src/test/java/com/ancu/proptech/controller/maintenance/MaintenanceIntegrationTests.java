package com.ancu.proptech.controller.maintenance;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.maintenance.MaintenanceTicket;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.maintenance.MaintenanceTicketRepository;
import com.ancu.proptech.service.auth.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class MaintenanceIntegrationTests {
 @Autowired MockMvc mvc;
 @Autowired AuthAccountRepository accounts;
 @Autowired PropertyRepository properties;
 @Autowired MaintenanceTicketRepository tickets;
 @Autowired AuthService auth;
 @Autowired PasswordEncoder encoder;
 private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Kiểm thử bảo trì");a.setPasswordHash(encoder.encode("Test!12345678"));a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);}
 private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Test!12345678").tokens().accessToken();}
 @Test void listsArePrivateScopedAndPersisted()throws Exception{
  var owner=account(AuthAccount.Role.OWNER);var other=account(AuthAccount.Role.OWNER);var customer=account(AuthAccount.Role.CUSTOMER);
  var p=new Property();p.setOwner(owner);p.setName("Tòa kiểm thử");p.setAddress("Địa chỉ kiểm thử");p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(p);
  var t=new MaintenanceTicket();t.setProperty(p);t.setReporter(customer);t.setTitle("Máy bơm hỏng");t.setDescription("Kiểm thử lưu dữ liệu");t.setCategory(MaintenanceTicket.Category.WATER);t.setPriority(MaintenanceTicket.Priority.NORMAL);t.setStatus(MaintenanceTicket.Status.PENDING);t.setCreatedAt(Instant.now());tickets.saveAndFlush(t);
  mvc.perform(get("/api/v1/owner/maintenance-tickets")).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/v1/owner/maintenance-tickets").header("Authorization",token(owner))).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(t.getId().toString()));
  mvc.perform(get("/api/v1/owner/maintenance-tickets").header("Authorization",token(other))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
  mvc.perform(get("/api/v1/me/maintenance-tickets").header("Authorization",token(customer))).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].title").value("Máy bơm hỏng"));
  mvc.perform(get("/api/v1/me/maintenance-tickets").header("Authorization",token(other))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
  mvc.perform(get("/api/v1/owner/maintenance-tickets").header("Authorization",token(customer))).andExpect(status().isForbidden());
  mvc.perform(get("/api/v1/owner/maintenance-tickets?size=0").header("Authorization",token(owner))).andExpect(status().isBadRequest());
 }
}
