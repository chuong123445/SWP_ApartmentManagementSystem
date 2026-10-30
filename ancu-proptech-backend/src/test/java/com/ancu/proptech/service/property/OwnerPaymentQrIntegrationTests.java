package com.ancu.proptech.service.property;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class OwnerPaymentQrIntegrationTests {
    private static final String URL="/api/v1/owner/cash-entries";
    @Autowired MockMvc mvc;
    @Autowired jakarta.persistence.EntityManager em;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired PasswordEncoder encoder;
    @Autowired AuthService auth;
    private AuthAccount account(AuthAccount.Role role) {
        var a=new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");
        a.setFullName("Kiểm thử sổ quỹ");a.setPasswordHash(encoder.encode("Test!12345678"));a.setRole(role);
        a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);
    }
    private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Test!12345678").tokens().accessToken();}
    private Property property(AuthAccount owner) {
        var p=new Property();p.setOwner(owner);p.setName("Tòa kiểm thử sổ quỹ");p.setAddress("Địa chỉ thử");
        p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);return properties.saveAndFlush(p);
    }


 private org.springframework.mock.web.MockMultipartFile qr()throws Exception{var matrix=new com.google.zxing.qrcode.QRCodeWriter().encode(PaymentQrDecoderTests.payload("00123456789",null),com.google.zxing.BarcodeFormat.QR_CODE,500,500);var out=new java.io.ByteArrayOutputStream();com.google.zxing.client.j2se.MatrixToImageWriter.writeToStream(matrix,"PNG",out);return new org.springframework.mock.web.MockMultipartFile("file","qr.png","image/png",out.toByteArray());}
 @Test void scansWithoutActivatingAndConfirmsOnlyForOwner()throws Exception {
  var owner=account(AuthAccount.Role.OWNER);var other=account(AuthAccount.Role.OWNER);String t=token(owner),o=token(other),base="/api/v1/owner/payment-qr";
  mvc.perform(get(base+"/current").header("Authorization",t)).andExpect(status().isNoContent());
  String json=mvc.perform(multipart(base+"/scan").file(qr()).header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.confirmed").value(false)).andExpect(jsonPath("$.accountNumber").value("00123456789")).andReturn().getResponse().getContentAsString();
  String id=com.jayway.jsonpath.JsonPath.read(json,"$.id");
  mvc.perform(get(base+"/current").header("Authorization",t)).andExpect(status().isNoContent());
  mvc.perform(get(base+"/"+id+"/image")).andExpect(status().isUnauthorized());
  mvc.perform(get(base+"/"+id+"/image").header("Authorization",o)).andExpect(status().isNotFound());
  String confirm="{\"accountHolderName\":\"NGUYEN VAN TEST\",\"version\":0,\"consent\":true}";
  mvc.perform(post(base+"/"+id+"/confirm").header("Authorization",o).contentType("application/json").content(confirm)).andExpect(status().isNotFound());
  mvc.perform(post(base+"/"+id+"/confirm").header("Authorization",t).contentType("application/json").content(confirm.replace("true","false"))).andExpect(status().isBadRequest());
  mvc.perform(post(base+"/"+id+"/confirm").header("Authorization",t).contentType("application/json").content(confirm)).andExpect(status().isOk()).andExpect(jsonPath("$.confirmed").value(true));
  mvc.perform(get(base+"/current").header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.accountHolderName").value("NGUYEN VAN TEST"));
  mvc.perform(get(base+"/"+id+"/image").header("Authorization",t)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(content().contentType("image/png"));
  mvc.perform(post(base+"/"+id+"/confirm").header("Authorization",t).contentType("application/json").content(confirm)).andExpect(status().isConflict());
  mvc.perform(multipart(base+"/scan").file(new org.springframework.mock.web.MockMultipartFile("file","bad.png","image/png","bad".getBytes())).header("Authorization",t)).andExpect(status().isBadRequest());
 }
}
