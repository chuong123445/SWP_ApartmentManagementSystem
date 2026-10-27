package com.ancu.proptech.controller.apartment;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.AuthService;
import com.ancu.proptech.support.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.time.Instant;
import java.math.BigDecimal;
import java.io.ByteArrayOutputStream;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.seed.enabled=false","app.billing.local-fixtures=false"}) @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class ApartmentPricesImagesIntegrationTests {
 @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired ExternalIdentityRepository identities;
 @Autowired PropertyRepository properties;@Autowired ApartmentRepository apartments;@Autowired PropertyImageRepository images;
 @Autowired RentalRequestRepository requests;@Autowired AuthService auth;@Autowired ObjectMapper json;
 AuthAccount owner,other;String token,otherToken;Apartment apartment;
 @BeforeEach void setup(){owner=account();other=account();VerifiedIdentityFixtures.bind(identities,owner);VerifiedIdentityFixtures.bind(identities,other);token=bearer(owner);otherToken=bearer(other);
  var p=new Property();p.setOwner(owner);p.setName("Ảnh và giá kiểm thử");p.setAddress("Địa chỉ kiểm thử");p.setCity("Đà Nẵng");p.setDistrict("Hải Châu");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);properties.saveAndFlush(p);
  apartment=new Apartment();apartment.setProperty(p);apartment.setRoomNumber("A.01");apartment.setTitle("Căn hộ kiểm thử");apartment.setDescription("");apartment.setAreaM2(new BigDecimal("40"));apartment.setAdvertisedMonthlyRent(new BigDecimal("4000000"));apartment.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);apartment.setAvailability(Apartment.Availability.VACANT);apartment.setCreatedAt(Instant.now());apartments.saveAndFlush(apartment);
 }
 AuthAccount account(){var a=new AuthAccount();a.setEmail("images-"+TestIds.next()+"@example.invalid");a.setFullName("Tài khoản thử");a.setRole(AuthAccount.Role.OWNER);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);}
 String bearer(AuthAccount a){return "Bearer "+auth.createSession(a).tokens().accessToken();}
 String priceBody(){return "{\"version\":"+apartment.getVersion()+",\"monthlyRent\":\"5000000\",\"electricityUnitPrice\":\"3500\",\"waterUnitPrice\":\"17000\"}";}
 ResultActions change(String auth,String body)throws Exception{return mvc.perform(patch("/api/v1/owner/apartments/"+apartment.getId()+"/prices").header("Authorization",auth).contentType("application/json").content(body));}
 byte[] png()throws Exception{var out=new ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(3,3,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",out);return out.toByteArray();}
 MockMultipartFile file()throws Exception{return new MockMultipartFile("files","anh.png","image/png",png());}
 @Test void editsVacantPricesAndPreservesMeterReadings()throws Exception{apartment.setElectricityIndex(120);apartment.setWaterIndex(20);apartments.flush();long version=apartment.getVersion();change(token,priceBody()).andExpect(status().isOk()).andExpect(jsonPath("$.advertisedMonthlyRent").value("5000000")).andExpect(jsonPath("$.electricityUnitPrice").value("3500"));assertTrue(apartment.getVersion()>version);assertEquals(120,apartment.getElectricityIndex());}
 @Test void pendingRequestBlocksAllPricesAndHistoryKeepsQuote()throws Exception{var r=new RentalRequest();r.setApartment(apartment);r.setCustomer(other);r.setMessage("");r.setStatus(RentalRequest.Status.PENDING);r.setCreatedAt(Instant.now());r.setQuotedMonthlyRent(apartment.getAdvertisedMonthlyRent());requests.saveAndFlush(r);change(token,priceBody()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PENDING_REQUESTS_EXIST"));r.setStatus(RentalRequest.Status.REJECTED);requests.flush();change(token,priceBody()).andExpect(status().isOk());assertEquals(0,new BigDecimal("4000000").compareTo(r.getQuotedMonthlyRent()));}
 @Test void occupiedContractInProgressAndMaintenanceRejectEdits()throws Exception{for(var state:List.of(Apartment.Availability.OCCUPIED,Apartment.Availability.CONTRACT_IN_PROGRESS,Apartment.Availability.MAINTENANCE)){apartment.setAvailability(state);apartments.flush();change(token,priceBody()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("APARTMENT_NOT_VACANT"));}}
 @Test void rejectsForeignOwnerStaleNegativeAndForgedFields()throws Exception{change(otherToken,priceBody()).andExpect(status().isNotFound());change(token,priceBody().replace("\"version\":"+apartment.getVersion(),"\"version\":9999")).andExpect(status().isConflict());change(token,priceBody().replace("3500","-1")).andExpect(status().isBadRequest());change(token,priceBody().replace("{","{\"ownerId\":\"1\",")).andExpect(status().isBadRequest());}
 @Test void stagedImagesPrivateThenPublicOnlyForApprovedPublishedProperty()throws Exception{var result=mvc.perform(multipart("/api/v1/me/property-images").file(file()).header("Authorization",token)).andExpect(status().isCreated()).andReturn();var id=json.readTree(result.getResponse().getContentAsString()).get(0).get("id").asText();mvc.perform(get("/api/v1/property-images/"+id)).andExpect(status().isNotFound());mvc.perform(get("/api/v1/property-images/"+id).header("Authorization",otherToken)).andExpect(status().isNotFound());mvc.perform(get("/api/v1/property-images/"+id).header("Authorization",token)).andExpect(status().isOk()).andExpect(content().contentType("image/png")).andExpect(header().string("X-Content-Type-Options","nosniff"));var image=images.findById(Long.valueOf(id)).orElseThrow();image.setPropertyId(apartment.getProperty().getId());images.flush();mvc.perform(get("/api/v1/property-images/"+id)).andExpect(status().isOk());mvc.perform(get("/api/v1/apartments/"+apartment.getId())).andExpect(jsonPath("$.images[0]").value("/api/v1/property-images/"+id));}
 @Test void rejectsMoreThanFourWrongBytesAndUnverifiedUploads()throws Exception{var request=multipart("/api/v1/me/property-images").header("Authorization",token);for(int n=0;n<5;n++)request.file(file());mvc.perform(request).andExpect(status().isBadRequest());mvc.perform(multipart("/api/v1/me/property-images").file(new MockMultipartFile("files","fake.png","image/png","<svg/>".getBytes())).header("Authorization",token)).andExpect(status().isBadRequest());identities.deleteById(owner.getId());identities.flush();mvc.perform(multipart("/api/v1/me/property-images").file(file()).header("Authorization",token)).andExpect(status().isForbidden());}
 @Test void newPropertyRequiresOneToFourOwnUnusedImages()throws Exception{var id=PropertyImageFixtures.stage(images,owner.getId());String prefix="{\"name\":\"Tài sản ảnh\",\"address\":\"Địa chỉ\",\"city\":\"Đà Nẵng\",\"district\":\"Hải Châu\",\"rentalMode\":\"SINGLE_UNIT\",\"apartments\":[{\"roomNumber\":\"A.01\",\"title\":\"Căn ảnh\",\"floor\":1,\"areaM2\":40,\"advertisedMonthlyRent\":4000000}]";
  for(String suffix:List.of(",\"imageIds\":[null]}",",\"imageIds\":[]}",",\"imageIds\":[\""+id+"\",\""+id+"\"]}",",\"imageIds\":[\""+PropertyImageFixtures.stage(images,other.getId())+"\"]}"))mvc.perform(post("/api/v1/owner/properties").header("Authorization",token).contentType("application/json").content(prefix+suffix)).andExpect(status().isBadRequest());
  String body=prefix+",\"imageIds\":[\""+id+"\"]}";mvc.perform(post("/api/v1/owner/properties").header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.property.id").isString());mvc.perform(post("/api/v1/owner/properties").header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isBadRequest());assertNotNull(images.findById(id).orElseThrow().getPropertyId());assertTrue(owner.getId()>0);}
}
