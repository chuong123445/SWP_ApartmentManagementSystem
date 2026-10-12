package com.ancu.proptech.controller.apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
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
class OwnerApartmentIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;
    @Autowired PasswordEncoder passwords;
    @Autowired AuthService auth;
    private AuthAccount owner, other, customer;
    private Property approved, pending, foreignProperty;
    private String ownerToken;
    @BeforeEach void fixture() {
        owner = account(AuthAccount.Role.OWNER); other = account(AuthAccount.Role.OWNER); customer = account(AuthAccount.Role.CUSTOMER);
        approved = property(owner, Property.ApprovalStatus.APPROVED);
        pending = property(owner, Property.ApprovalStatus.PENDING_APPROVAL);
        foreignProperty = property(other, Property.ApprovalStatus.APPROVED);
        ownerToken = token(owner);
    }
    private AuthAccount account(AuthAccount.Role role) {
        AuthAccount a = new AuthAccount(); a.setEmail(UUID.randomUUID()+"@example.invalid");a.setFullName("Owner integration");
        a.setPasswordHash(passwords.encode("Owner-test!12345"));a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setContactVerified(true);
        return accounts.saveAndFlush(a);
    }
    private Property property(AuthAccount owner, Property.ApprovalStatus approval) {
        Property p = new Property();p.setOwner(owner);p.setName("Property "+UUID.randomUUID());p.setAddress("Test address");
        p.setCity("Test city");p.setDistrict("Test district");p.setApprovalStatus(approval);return properties.saveAndFlush(p);
    }
    private String token(AuthAccount a) { return auth.login(a.getEmail(), "Owner-test!12345").tokens().accessToken(); }
    private String body(Property p, String publication) {
        return """
            {"propertyId":"%s","roomNumber":"A.301","title":"Owner apartment","description":"Test apartment",
             "floor":3,"areaM2":"28.50","advertisedMonthlyRent":"5000000.00","deposit":"4000000.00",
             "electricityIndex":1200,"waterIndex":110,"maxOccupants":2,"amenities":["Air conditioning"],"publicationStatus":"%s"}
            """.formatted(p.getId(),publication);
    }
    private ResultActions create(String token, String body) throws Exception {
        return mvc.perform(post("/api/v1/owner/apartments").header("Authorization","Bearer "+token).contentType("application/json").content(body));
    }
    @Test void sameApartmentIsManagedByOwnerAndDisplayedPubliclyWithPersistedReadings() throws Exception {
        var result = create(ownerToken,body(approved,"PUBLISHED")).andExpect(status().isCreated())
            .andExpect(jsonPath("$.ownerId").value(owner.getId().toString())).andExpect(jsonPath("$.propertyId").value(approved.getId().toString()))
            .andExpect(jsonPath("$.electricityIndex").value(1200)).andExpect(jsonPath("$.waterIndex").value(110))
            .andExpect(jsonPath("$.areaM2").value("28.50")).andExpect(jsonPath("$.availability").value("VACANT")).andReturn();
        String id = JsonPath.read(result.getResponse().getContentAsString(),"$.id");
        apartments.flush();assertNotNull(apartments.findById(UUID.fromString(id)).orElseThrow().getProperty());
        mvc.perform(get("/api/v1/owner/apartments").header("Authorization","Bearer "+ownerToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
        mvc.perform(get("/api/v1/apartments/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.publicOwner.id").value(owner.getId().toString()));
    }
    @Test void ownerCannotReadOrCreateApartmentsInAnotherOwnersProperty() throws Exception {
        create(ownerToken,body(foreignProperty,"DRAFT")).andExpect(status().isNotFound());
        create(token(other),body(foreignProperty,"DRAFT")).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/owner/apartments").param("ownerId",other.getId().toString()).header("Authorization","Bearer "+ownerToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/owner/properties").header("Authorization","Bearer "+ownerToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }
    @Test void draftsArePrivateAndUnapprovedPropertyCannotBePublished() throws Exception {
        create(ownerToken,body(pending,"PUBLISHED")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PROPERTY_NOT_APPROVED"));
        var result=create(ownerToken,body(pending,"DRAFT")).andExpect(status().isCreated()).andReturn();
        String id=JsonPath.read(result.getResponse().getContentAsString(),"$.id");
        mvc.perform(get("/api/v1/apartments/"+id)).andExpect(status().isNotFound());
    }
    @Test void duplicateNumbersInvalidReadingsAndForgedStateAreRejected() throws Exception {
        create(ownerToken,body(approved,"DRAFT")).andExpect(status().isCreated());
        create(ownerToken,body(approved,"DRAFT")).andExpect(status().isConflict());
        create(ownerToken,body(approved,"DRAFT").replace("1200","-1")).andExpect(status().isBadRequest());
        for(String field : new String[]{"id","ownerId","availability","version"})
            create(ownerToken,body(approved,"DRAFT").replace("\"floor\":3", "\""+field+"\":\"forged\",\"floor\":3")).andExpect(status().isBadRequest());
    }
    @Test void guestCustomerAndUnverifiedOwnerCannotManageInventory() throws Exception {
        mvc.perform(get("/api/v1/owner/apartments")).andExpect(status().isUnauthorized());
        create(token(customer),body(approved,"DRAFT")).andExpect(status().isForbidden());
        owner.setContactVerified(false);accounts.saveAndFlush(owner);
        create(ownerToken,body(approved,"DRAFT")).andExpect(status().isForbidden());
    }
}
