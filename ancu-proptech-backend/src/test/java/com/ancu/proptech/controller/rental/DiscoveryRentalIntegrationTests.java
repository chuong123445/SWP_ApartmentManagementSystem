package com.ancu.proptech.controller.rental;

import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.AuthService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class DiscoveryRentalIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;
    @Autowired RentalRequestRepository requests;
    @Autowired AuthService auth;
    @Autowired PasswordEncoder passwords;
    @Autowired EntityManager em;
    private static final String PASSWORD = "Rental-test-only!123";
    private static String passwordHash;
    private String marker;
    private AuthAccount ownerA, ownerB, customerA, customerB;
    private Property property;
    private Apartment apartment, otherApartment, hidden;

    @BeforeEach void fixture() {
        if (passwordHash == null) passwordHash = passwords.encode(PASSWORD);
        marker = "RentalTest" + UUID.randomUUID().toString().substring(0, 8);
        ownerA = account("owner-a", AuthAccount.Role.OWNER);
        ownerB = account("owner-b", AuthAccount.Role.OWNER);
        customerA = account("customer-a", AuthAccount.Role.CUSTOMER);
        customerB = account("customer-b", AuthAccount.Role.CUSTOMER);
        property = property(ownerA);
        apartment = apartment(property, "Studio", "5000000.00", Apartment.PublicationStatus.PUBLISHED);
        otherApartment = apartment(property(ownerB), "Large", "9000000.00", Apartment.PublicationStatus.PUBLISHED);
        hidden = apartment(property, "Hidden", "4000000.00", Apartment.PublicationStatus.DRAFT);
        apartments.flush();
    }
    private AuthAccount account(String label, AuthAccount.Role role) {
        AuthAccount a = new AuthAccount();
        a.setEmail(marker.toLowerCase(Locale.ROOT) + "-" + label + "@example.invalid");
        a.setFullName(label); a.setPasswordHash(passwordHash); a.setRole(role); a.setStatus(AuthAccount.Status.ACTIVE); a.setContactVerified(true);
        return accounts.saveAndFlush(a);
    }
    private Property property(AuthAccount owner) {
        Property p = new Property(); p.setOwner(owner); p.setName(marker + " Property"); p.setAddress("Địa chỉ kiểm thử");
        p.setCity("Test City"); p.setDistrict("Test District"); p.setApprovalStatus(Property.ApprovalStatus.APPROVED);
        return properties.saveAndFlush(p);
    }
    private Apartment apartment(Property p, String name, String rent, Apartment.PublicationStatus status) {
        Apartment a = new Apartment(); a.setProperty(p); a.setTitle(marker + name); a.setDescription("Thông tin căn hộ kiểm thử");
        a.setAreaM2(new BigDecimal("28.00")); a.setAdvertisedMonthlyRent(new BigDecimal(rent));
        a.setAmenities(new ArrayList<>(List.of("Máy lạnh"))); a.setBedrooms(1); a.setBathrooms(1);
        a.setPublicationStatus(status); a.setAvailability(Apartment.Availability.VACANT); a.setCreatedAt(Instant.now());
        return apartments.saveAndFlush(a);
    }
    private String token(AuthAccount a) { return auth.login(a.getEmail(), PASSWORD).tokens().accessToken(); }
    private String bearer(AuthAccount a) { return "Bearer " + token(a); }

    @Test void publicSearchFiltersAndPaginationExcludeUnpublishedData() throws Exception {
        mvc.perform(get("/api/v1/apartments").param("q", marker).param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/v1/apartments").param("q", marker).param("maxRent", "6000000"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(apartment.getId().toString()))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/apartments").param("q", marker + "no-results"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty()).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void detailsExposePublicOwnerOnlyAndHideDraft() throws Exception {
        mvc.perform(get("/api/v1/apartments/" + apartment.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.advertisedMonthlyRent").value("5000000.00"))
                .andExpect(jsonPath("$.publicOwner.displayName").value("owner-a"))
                .andExpect(jsonPath("$.publicOwner.email").doesNotExist()).andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.publicOwner.passwordHash").doesNotExist());
        mvc.perform(get("/api/v1/apartments/" + hidden.getId())).andExpect(status().isNotFound());
    }
    @Test void propertyApprovalAndCurrentOwnerVerificationAreRequiredForPublicAccess() throws Exception {
        property.setApprovalStatus(Property.ApprovalStatus.PENDING_APPROVAL); properties.saveAndFlush(property);
        mvc.perform(get("/api/v1/apartments/" + apartment.getId())).andExpect(status().isNotFound());
        property.setApprovalStatus(Property.ApprovalStatus.APPROVED); properties.saveAndFlush(property);
        ownerA.setContactVerified(false); accounts.saveAndFlush(ownerA);
        mvc.perform(get("/api/v1/apartments/" + apartment.getId())).andExpect(status().isNotFound());
        ownerA.setContactVerified(true); ownerA.setStatus(AuthAccount.Status.LOCKED); accounts.saveAndFlush(ownerA);
        mvc.perform(get("/api/v1/apartments/" + apartment.getId())).andExpect(status().isNotFound());
    }
    @Test void guestsAndUnverifiedCustomersCannotSubmitButCanBrowse() throws Exception {
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        customerA.setStatus(AuthAccount.Status.PENDING_VERIFICATION); customerA.setContactVerified(false); accounts.saveAndFlush(customerA);
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", bearer(customerA))
                .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CONTACT_NOT_VERIFIED"));
        mvc.perform(get("/api/v1/apartments").param("q", marker)).andExpect(status().isOk());
    }
    @Test void multipleRequestsStayPendingAndDoNotReserveTheApartment() throws Exception {
        for (AuthAccount customer : List.of(customerA, customerB)) {
            mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", bearer(customer))
                    .contentType("application/json").content("{\"message\":\" Tôi muốn thuê căn hộ \"}"))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"))
                    .andExpect(jsonPath("$.customerId").value(customer.getId().toString()))
                    .andExpect(jsonPath("$.message").value("Tôi muốn thuê căn hộ"));
        }
        em.flush(); em.clear();
        assertEquals(Apartment.Availability.VACANT, apartments.findById(apartment.getId()).orElseThrow().getAvailability());
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", bearer(ownerA)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization", bearer(customerA)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }
    @Test void inboxAndHistoryAreScopedToTheirPrincipal() throws Exception {
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", bearer(customerA))
                .contentType("application/json").content("{\"message\":\"Private request\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", bearer(ownerB)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/owner/rental-requests").param("apartmentId", apartment.getId().toString()).header("Authorization", bearer(ownerB)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization", bearer(customerB)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", bearer(customerA))).andExpect(status().isForbidden());
    }
    @Test void clientCannotSpoofIdentityStatusOrCreationTimeAndMessageIsBounded() throws Exception {
        String bearer = bearer(customerA);
        for (String field : List.of("customerId", "ownerId", "status", "createdAt", "advertisedMonthlyRent")) {
            mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", bearer)
                    .contentType("application/json").content("{\"message\":\"Hello\",\"" + field + "\":\"spoof\"}"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", bearer)
                .contentType("application/json").content("{\"message\":\"" + "x".repeat(2001) + "\"}"))
                .andExpect(status().isBadRequest());
    }
    @Test void unavailableAndHiddenApartmentsRejectSubmission() throws Exception {
        String bearer = bearer(customerA);
        apartment.setAvailability(Apartment.Availability.CONTRACT_IN_PROGRESS); apartments.saveAndFlush(apartment);
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", bearer).contentType("application/json").content("{}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("APARTMENT_NOT_AVAILABLE"));
        mvc.perform(post("/api/v1/apartments/" + hidden.getId() + "/rental-requests").header("Authorization", bearer).contentType("application/json").content("{}"))
                .andExpect(status().isNotFound());
    }
}
