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
class AssetManagementIntegrationTests {
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

 @Test void ownDraftUsesSharedDetailAndOthersCannotReadOrEditIt()throws Exception{
  apartment.setPublicationStatus(Apartment.PublicationStatus.DRAFT);apartment.getProperty().setApprovalStatus(Property.ApprovalStatus.DRAFT);apartments.flush();properties.flush();
  String url="/api/v1/apartments/"+apartment.getId();mvc.perform(get(url).header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.management.canEdit").value(true)).andExpect(jsonPath("$.management.approvalStatus").value("DRAFT")).andExpect(header().string("Cache-Control","no-store"));
  mvc.perform(get(url).header("Authorization",otherToken)).andExpect(status().isNotFound());mvc.perform(get(url)).andExpect(status().isNotFound());
  mvc.perform(get("/api/v1/me/properties").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$[0].apartments[0].id").value(apartment.getId().toString()));
  mvc.perform(get("/api/v1/me/properties").header("Authorization",otherToken)).andExpect(jsonPath("$.length()").value(0));
 }
 String information(){return "{\"version\":"+apartment.getVersion()+",\"title\":\"Tiêu đề mới\",\"description\":\"Thông tin thật\",\"maxOccupants\":3,\"amenities\":[\"Máy lạnh\"]}";}
 @Test void exactOwnerCanEditListingWithoutChangingLegalFieldsOrPrices()throws Exception{
  String url="/api/v1/me/apartments/"+apartment.getId();String body=information();
  mvc.perform(patch(url).header("Authorization",otherToken).contentType("application/json").content(body)).andExpect(status().isNotFound());
  mvc.perform(patch(url).header("Authorization",token).contentType("application/json").content(body.replace("{","{\"areaM2\":999,"))).andExpect(status().isBadRequest());
  mvc.perform(patch(url).header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isNoContent());
  mvc.perform(patch(url).header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isConflict());assertEquals("40",apartment.getAreaM2().stripTrailingZeros().toPlainString());assertEquals("Tiêu đề mới",apartment.getTitle());
 }
 String gallery(List<Long> ids,long version){return json.writeValueAsString(Map.of("imageIds",ids,"version",version));}
 @Test void replaceGalleryPreservesSelectedImagesAndRejectsStaleVersion()throws Exception{
  var p=apartment.getProperty();Long first=PropertyImageFixtures.stage(images,owner.getId()),second=PropertyImageFixtures.stage(images,owner.getId());var old=images.findById(first).orElseThrow();old.setPropertyId(p.getId());images.flush();long version=p.getVersion();
  String url="/api/v1/me/properties/"+p.getId()+"/images";String body=gallery(List.of(first,second),version);
  mvc.perform(put(url).header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isNoContent());assertEquals(List.of(first,second),images.ids(p.getId()));assertTrue(p.getVersion()>version);
  mvc.perform(put(url).header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isConflict());
  mvc.perform(put(url).header("Authorization",token).contentType("application/json").content(gallery(List.of(second),p.getVersion()))).andExpect(status().isNoContent());assertFalse(images.existsById(first));assertEquals(List.of(second),images.ids(p.getId()));
 }
 @Test void galleryCannotStealImagesOrLeaveNoImage()throws Exception{
  var p=apartment.getProperty();String url="/api/v1/me/properties/"+p.getId()+"/images";Long otherImage=PropertyImageFixtures.stage(images,other.getId());
  mvc.perform(put(url).header("Authorization",token).contentType("application/json").content(gallery(List.of(otherImage),p.getVersion()))).andExpect(status().isBadRequest());
  mvc.perform(put(url).header("Authorization",token).contentType("application/json").content(gallery(List.of(),p.getVersion()))).andExpect(status().isBadRequest());assertNull(images.findById(otherImage).orElseThrow().getPropertyId());
 }
 @Test void pendingApplicantCanManageOwnDraftWithoutOperationalRole()throws Exception{
  owner.setRole(AuthAccount.Role.CUSTOMER);accounts.flush();apartment.setPublicationStatus(Apartment.PublicationStatus.DRAFT);apartment.getProperty().setApprovalStatus(Property.ApprovalStatus.DRAFT);apartments.flush();properties.flush();
  mvc.perform(get("/api/v1/me/properties").header("Authorization",token)).andExpect(status().isOk());
  mvc.perform(patch("/api/v1/me/apartments/"+apartment.getId()).header("Authorization",token).contentType("application/json").content(information())).andExpect(status().isNoContent());
  mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization",token)).andExpect(status().isForbidden());assertEquals(AuthAccount.Role.CUSTOMER,owner.getRole());
 }
 @Test void newPriceEndpointKeepsPendingAndOccupiedLocks()throws Exception{
  var r=new RentalRequest();r.setApartment(apartment);r.setCustomer(other);r.setMessage("");r.setStatus(RentalRequest.Status.PENDING);r.setCreatedAt(Instant.now());requests.saveAndFlush(r);
  String url="/api/v1/me/apartments/"+apartment.getId()+"/prices";mvc.perform(patch(url).header("Authorization",token).contentType("application/json").content(priceBody())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PENDING_REQUESTS_EXIST"));
  mvc.perform(get("/api/v1/apartments/"+apartment.getId()).header("Authorization",token)).andExpect(jsonPath("$.management.pricesEditable").value(false));
  r.setStatus(RentalRequest.Status.REJECTED);requests.flush();apartment.setAvailability(Apartment.Availability.OCCUPIED);apartments.flush();mvc.perform(patch(url).header("Authorization",token).contentType("application/json").content(priceBody())).andExpect(status().isConflict());
 }
}
