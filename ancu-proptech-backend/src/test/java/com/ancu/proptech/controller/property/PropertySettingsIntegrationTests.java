package com.ancu.proptech.controller.property;

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
class PropertySettingsIntegrationTests {
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

 @Test void persistsZeroAndRejectsStaleUpdatesAndForeignOwners()throws Exception {
  var owner=account(AuthAccount.Role.OWNER);var other=account(AuthAccount.Role.OWNER);var customer=account(AuthAccount.Role.CUSTOMER);var p=property(owner);String t=token(owner),url="/api/v1/owner/properties/"+p.getId()+"/settings";
  mvc.perform(get(url)).andExpect(status().isUnauthorized());
  mvc.perform(get(url).header("Authorization",token(other))).andExpect(status().isNotFound());
  mvc.perform(get(url).header("Authorization",token(customer))).andExpect(status().isForbidden());
  mvc.perform(get(url).header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.configured").value(false)).andExpect(jsonPath("$.version").value(0)).andExpect(jsonPath("$.receivingAccount").isEmpty());
  String body="{\"version\":0,\"electricityUnitPrice\":\"0\",\"waterUnitPrice\":\"25000\",\"internetFee\":\"100000\",\"garbageFee\":\"30000\"}";
  mvc.perform(put(url).header("Authorization",token(other)).contentType("application/json").content(body)).andExpect(status().isNotFound());
  mvc.perform(put(url).header("Authorization",t).contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.configured").value(true)).andExpect(jsonPath("$.version").value(1));
  em.clear();
  mvc.perform(get(url).header("Authorization",t)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.electricityUnitPrice").value("0.00")).andExpect(jsonPath("$.internetFee").value("100000.00"));
  mvc.perform(put(url).header("Authorization",t).contentType("application/json").content(body)).andExpect(status().isConflict());
  mvc.perform(put(url).header("Authorization",t).contentType("application/json").content(body.replace("\"version\":0","\"version\":1"))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
  mvc.perform(put(url).header("Authorization",t).contentType("application/json").content(body.replace("25000","-1"))).andExpect(status().isBadRequest());
  mvc.perform(put(url).header("Authorization",t).contentType("application/json").content(body.replace("25000","1.001"))).andExpect(status().isBadRequest());
  var otherProperty=property(owner);
  mvc.perform(get("/api/v1/owner/properties/"+otherProperty.getId()+"/settings").header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.configured").value(false));
 }
}
