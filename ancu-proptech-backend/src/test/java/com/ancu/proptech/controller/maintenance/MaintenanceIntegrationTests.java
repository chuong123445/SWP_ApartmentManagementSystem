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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class MaintenanceIntegrationTests {
 @Autowired MockMvc mvc;
 @Autowired AuthAccountRepository accounts;
 @Autowired PropertyRepository properties;
 @Autowired MaintenanceTicketRepository tickets;
 @Autowired AuthService auth;
 @Autowired PasswordEncoder encoder;
 @Autowired com.ancu.proptech.repository.apartment.ApartmentRepository apartments;
 @Autowired com.ancu.proptech.repository.contract.RentalContractRepository contracts;
 private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Kiểm thử bảo trì");a.setPasswordHash(encoder.encode("Test!12345678"));a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);}
 private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Test!12345678").tokens().accessToken();}
 @Test void customerCanOnlyReportOccupiedApartmentWithOwnActiveLease()throws Exception{
  var owner=account(AuthAccount.Role.OWNER);var customer=account(AuthAccount.Role.CUSTOMER);var outsider=account(AuthAccount.Role.CUSTOMER);
  var p=new Property();p.setOwner(owner);p.setName("Tòa thử quan hệ thuê");p.setAddress("Địa chỉ thử");p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(p);
  var a=new com.ancu.proptech.model.apartment.Apartment();a.setProperty(p);a.setTitle("Phòng thử");a.setRoomNumber("A.101");a.setDescription("Thử");a.setAreaM2(new java.math.BigDecimal("20"));a.setAdvertisedMonthlyRent(new java.math.BigDecimal("1000000"));a.setPublicationStatus(com.ancu.proptech.model.apartment.Apartment.PublicationStatus.PUBLISHED);a.setAvailability(com.ancu.proptech.model.apartment.Apartment.Availability.OCCUPIED);a.setCreatedAt(Instant.now());apartments.saveAndFlush(a);
  var c=new com.ancu.proptech.model.contract.RentalContract();c.setApartment(a);c.setCustomer(customer);c.setStatus(com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE);c.setStartDate(java.time.LocalDate.of(2020,1,1));c.setEndDate(java.time.LocalDate.of(2030,1,1));c.setMonthlyRent(new java.math.BigDecimal("1000000"));c.setElectricityUnitPrice(java.math.BigDecimal.ZERO);c.setWaterUnitPrice(java.math.BigDecimal.ZERO);contracts.saveAndFlush(c);
  String body="{\"apartmentId\":"+a.getId()+",\"title\":\"Vòi nước hỏng\",\"description\":\"Không khóa được\",\"category\":\"WATER\",\"priority\":\"HIGH\"}";
  mvc.perform(post("/api/v1/me/maintenance-tickets").header("Authorization",token(outsider)).contentType("application/json").content(body)).andExpect(status().isNotFound());
  mvc.perform(post("/api/v1/me/maintenance-tickets").header("Authorization",token(customer)).contentType("application/json").content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.apartmentId").value(a.getId().toString())).andExpect(jsonPath("$.canConfirm").value(true));
  c.setStatus(com.ancu.proptech.model.contract.RentalContract.Status.ENDED);contracts.saveAndFlush(c);
  mvc.perform(post("/api/v1/me/maintenance-tickets").header("Authorization",token(customer)).contentType("application/json").content(body)).andExpect(status().isNotFound());
  mvc.perform(get("/api/v1/me/maintenance-tickets").header("Authorization",token(customer))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.totalElements").value(1));
 }
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
  String body="{\"propertyId\":"+p.getId()+",\"title\":\"Đèn hành lang\",\"description\":\"Đèn không sáng\",\"category\":\"ELECTRIC\",\"priority\":\"NORMAL\"}";
  mvc.perform(post("/api/v1/owner/maintenance-tickets").header("Authorization",token(owner)).contentType("application/json").content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING")).andExpect(jsonPath("$.roomNumber").value("Toàn tòa"));
  mvc.perform(post("/api/v1/owner/maintenance-tickets").header("Authorization",token(other)).contentType("application/json").content(body)).andExpect(status().isNotFound());
  mvc.perform(post("/api/v1/me/maintenance-tickets").header("Authorization",token(customer)).contentType("application/json").content(body)).andExpect(status().isNotFound());
  mvc.perform(post("/api/v1/owner/maintenance-tickets").header("Authorization",token(owner)).contentType("application/json").content(body.replace("Đèn hành lang"," "))).andExpect(status().isBadRequest());
  String path="/api/v1/owner/maintenance-tickets/"+t.getId()+"/actions";
  var bitmap=new java.awt.image.BufferedImage(10,10,java.awt.image.BufferedImage.TYPE_INT_RGB);var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(bitmap,"png",output);
  var file=new org.springframework.mock.web.MockMultipartFile("file","test.png","image/png",output.toByteArray());
  String imagePath="/api/v1/maintenance-tickets/"+t.getId()+"/images";
  mvc.perform(multipart(imagePath).file(file).param("kind","BEFORE").header("Authorization",token(other))).andExpect(status().isNotFound());
  mvc.perform(multipart(imagePath).file(new org.springframework.mock.web.MockMultipartFile("file","fake.png","image/png","not an image".getBytes())).param("kind","BEFORE").header("Authorization",token(customer))).andExpect(status().isBadRequest());
  String image=mvc.perform(multipart(imagePath).file(file).param("kind","BEFORE").header("Authorization",token(customer))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String imageId=com.jayway.jsonpath.JsonPath.read(image,"$.id");
  mvc.perform(get("/api/v1/maintenance-images/"+imageId).header("Authorization",token(other))).andExpect(status().isNotFound());
  mvc.perform(get("/api/v1/maintenance-images/"+imageId).header("Authorization",token(owner))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(content().bytes(output.toByteArray()));
  t.setTenant(customer);tickets.saveAndFlush(t);long initial=t.getVersion();
  String accept="{\"version\":"+initial+",\"action\":\"ACCEPT\"}";
  mvc.perform(post(path).header("Authorization",token(other)).contentType("application/json").content(accept)).andExpect(status().isNotFound());
  mvc.perform(post(path).header("Authorization",token(customer)).contentType("application/json").content(accept)).andExpect(status().isForbidden());
  mvc.perform(post(path).header("Authorization",token(owner)).contentType("application/json").content(accept)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACCEPTED"));
  mvc.perform(post(path).header("Authorization",token(owner)).contentType("application/json").content(accept)).andExpect(status().isConflict());
  mvc.perform(post(path).header("Authorization",token(owner)).contentType("application/json").content("{\"version\":"+(initial+1)+",\"action\":\"ASSIGN\",\"technicianName\":\"Thợ kiểm thử\",\"technicianPhone\":\"0900000000\",\"scheduledAt\":\"2026-11-01T08:00:00Z\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS")).andExpect(jsonPath("$.history.length()").value(3));
  mvc.perform(post(path).header("Authorization",token(owner)).contentType("application/json").content("{\"version\":"+t.getVersion()+",\"action\":\"READY\",\"actualCost\":\"150000\",\"costResponsibility\":\"OWNER\",\"note\":\"Đã thay máy bơm\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AWAITING_CONFIRMATION"));
  String confirm="{\"version\":"+t.getVersion()+",\"action\":\"CONFIRM\"}";
  mvc.perform(post(path).header("Authorization",token(owner)).contentType("application/json").content(confirm)).andExpect(status().isConflict());
  String customerPath="/api/v1/me/maintenance-tickets/"+t.getId()+"/actions";
  mvc.perform(post(customerPath).header("Authorization",token(other)).contentType("application/json").content(confirm)).andExpect(status().isNotFound());
  mvc.perform(post(customerPath).header("Authorization",token(customer)).contentType("application/json").content("{\"version\":"+t.getVersion()+",\"action\":\"REOPEN\",\"note\":\"Vẫn rò nước\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
  mvc.perform(post(path).header("Authorization",token(owner)).contentType("application/json").content("{\"version\":"+t.getVersion()+",\"action\":\"READY\",\"actualCost\":\"150000\",\"costResponsibility\":\"OWNER\",\"note\":\"Đã sửa lại\"}")).andExpect(status().isOk());
  mvc.perform(post(customerPath).header("Authorization",token(customer)).contentType("application/json").content("{\"version\":"+t.getVersion()+",\"action\":\"CONFIRM\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVED")).andExpect(jsonPath("$.actualCost").value("150000.00")).andExpect(jsonPath("$.customerCost").value("0.00"));
 }
}
