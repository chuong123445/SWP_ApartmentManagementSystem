package com.ancu.proptech.controller.property;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AuthService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class OwnerPropertyIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;
    @Autowired PasswordEncoder passwords;
    @Autowired AuthService auth;
    private AuthAccount owner;
    private String token;
    @BeforeEach void fixture() { owner=account(AuthAccount.Role.OWNER);token=token(owner); }
    private AuthAccount account(AuthAccount.Role role) {
        var a=new AuthAccount();a.setEmail(UUID.randomUUID()+"@example.invalid");a.setFullName("Property integration");
        a.setPasswordHash(passwords.encode("Property-test!12345"));a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);
        a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);
    }
    private String token(AuthAccount a) { return auth.login(a.getEmail(),"Property-test!12345").tokens().accessToken(); }
    private String unit(String number) { return """
        {"roomNumber":"%s","title":"Căn hộ kiểm thử","floor":1,"areaM2":"32.50","advertisedMonthlyRent":"4500000.00","amenities":[]}
        """.formatted(number); }
    private String body(String mode,String units) { return """
        {"name":"Nhà cho thuê kiểm thử","address":"12 Đường Kiểm Thử","city":"TP. Hồ Chí Minh","district":"Quận 3","ward":"Phường Kiểm Thử","rentalMode":"%s","apartments":[%s]}
        """.formatted(mode,units); }
    private ResultActions create(String bearer,String input) throws Exception { return mvc.perform(post("/api/v1/owner/properties")
        .header("Authorization","Bearer "+bearer).contentType("application/json").content(input)); }
    @Test void singlePropertyPersistsOnePrivateDraftAndDoesNotInventMeterBaseline() throws Exception {
        var result=create(token,body("SINGLE_UNIT",unit("A.1205"))).andExpect(status().isCreated())
            .andExpect(jsonPath("$.property.approvalStatus").value("DRAFT"))
            .andExpect(jsonPath("$.property.rentalMode").value("SINGLE_UNIT"))
            .andExpect(jsonPath("$.apartments.length()").value(1))
            .andExpect(jsonPath("$.apartments[0].publicationStatus").value("DRAFT"))
            .andExpect(jsonPath("$.apartments[0].areaM2").value("32.50"))
            .andExpect(jsonPath("$.apartments[0].electricityIndex").isEmpty()).andReturn();
        String id=JsonPath.read(result.getResponse().getContentAsString(),"$.property.id");
        var p=properties.findById(UUID.fromString(id)).orElseThrow();assertEquals(owner.getId(),p.getOwner().getId());
        String a=JsonPath.read(result.getResponse().getContentAsString(),"$.apartments[0].id");
        mvc.perform(get("/api/v1/apartments/"+a)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].ward").value("Phường Kiểm Thử"));
    }
    @Test void multiPropertyCreatesDistinctDraftsTogetherAndSupportsAddingLater() throws Exception {
        var result=create(token,body("MULTI_UNIT",unit("P.101")+","+unit("P.102"))).andExpect(status().isCreated())
            .andExpect(jsonPath("$.apartments.length()").value(2)).andReturn();
        String id=JsonPath.read(result.getResponse().getContentAsString(),"$.property.id");
        assertEquals(2,apartments.countByPropertyId(UUID.fromString(id)));
        mvc.perform(post("/api/v1/owner/apartments").header("Authorization","Bearer "+token).contentType("application/json")
            .content(unit("P.103").replace("\"roomNumber\"","\"propertyId\":\""+id+"\",\"roomNumber\"")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.publicationStatus").value("DRAFT"));
    }
    @Test void singlePropertyRejectsMultipleUnitsAndCannotGainASecondUnit() throws Exception {
        create(token,body("SINGLE_UNIT",unit("1")+","+unit("2"))).andExpect(status().isBadRequest());
        assertEquals(0,properties.findByOwnerIdOrderByNameAscIdAsc(owner.getId()).size());
        var result=create(token,body("SINGLE_UNIT",unit("1"))).andExpect(status().isCreated()).andReturn();
        String id=JsonPath.read(result.getResponse().getContentAsString(),"$.property.id");
        mvc.perform(post("/api/v1/owner/apartments").header("Authorization","Bearer "+token).contentType("application/json")
            .content(unit("2").replace("\"roomNumber\"","\"propertyId\":\""+id+"\",\"roomNumber\"")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SINGLE_UNIT_LIMIT"));
    }
    @Test void invalidOrDuplicateNestedUnitsLeaveNoPartialProperty() throws Exception {
        create(token,body("MULTI_UNIT",unit("P.101")+","+unit(" p.101 "))).andExpect(status().isBadRequest());
        create(token,body("MULTI_UNIT",unit("1")+","+unit("2").replace("32.50","-1"))).andExpect(status().isBadRequest());
        create(token,body("MULTI_UNIT","null")).andExpect(status().isBadRequest());
        create(token,body("MULTI_UNIT","")).andExpect(status().isBadRequest());
        assertTrue(properties.findByOwnerIdOrderByNameAscIdAsc(owner.getId()).isEmpty());
    }
    @Test void forgedOwnershipApprovalPublicationAndNumericModeAreRejected() throws Exception {
        for (String field:new String[]{"ownerId","id","approvalStatus","version"})
            create(token,body("SINGLE_UNIT",unit("1")).replace("\"name\":","\""+field+"\":\"forged\",\"name\":"))
                .andExpect(status().isBadRequest());
        create(token,body("SINGLE_UNIT",unit("1").replace("\"floor\":1","\"publicationStatus\":\"PUBLISHED\",\"floor\":1"))).andExpect(status().isBadRequest());
        create(token,body("SINGLE_UNIT",unit("1")).replace("\"SINGLE_UNIT\"","0")).andExpect(status().isBadRequest());
        assertTrue(properties.findByOwnerIdOrderByNameAscIdAsc(owner.getId()).isEmpty());
    }
    @Test void guestCustomerPendingLockedAndUnverifiedOwnerCannotCreate() throws Exception {
        mvc.perform(post("/api/v1/owner/properties").contentType("application/json").content(body("SINGLE_UNIT",unit("1"))))
            .andExpect(status().isUnauthorized());
        create(token(account(AuthAccount.Role.CUSTOMER)),body("SINGLE_UNIT",unit("1"))).andExpect(status().isForbidden());
        owner.setEmailVerified(false);owner.setContactVerified(false);accounts.saveAndFlush(owner);
        create(token,body("SINGLE_UNIT",unit("1"))).andExpect(status().isForbidden());
        owner.setStatus(AuthAccount.Status.PENDING_VERIFICATION);accounts.saveAndFlush(owner);
        create(token,body("SINGLE_UNIT",unit("1"))).andExpect(status().isForbidden());
        owner.setStatus(AuthAccount.Status.LOCKED);accounts.saveAndFlush(owner);
        create(token,body("SINGLE_UNIT",unit("1"))).andExpect(status().isUnauthorized());
    }
    @Test void anotherOwnerCannotSeeNewPropertyOrPublishItsDrafts() throws Exception {
        var result=create(token,body("SINGLE_UNIT",unit("1"))).andExpect(status().isCreated()).andReturn();
        String id=JsonPath.read(result.getResponse().getContentAsString(),"$.property.id");
        mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+token(account(AuthAccount.Role.OWNER))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/v1/owner/apartments").header("Authorization","Bearer "+token).contentType("application/json")
            .content(unit("2").replace("\"roomNumber\"","\"propertyId\":\""+id+"\",\"publicationStatus\":\"PUBLISHED\",\"roomNumber\"")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PROPERTY_NOT_APPROVED"));
    }
}
