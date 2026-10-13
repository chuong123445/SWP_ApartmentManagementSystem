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
        a.setFullName(label); a.setPasswordHash(passwordHash); a.setRole(role); a.setStatus(AuthAccount.Status.ACTIVE); a.setContactVerified(true);a.setEmailVerified(true);
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

    @Test void ownerPropertyFilterRunsBeforePaginationAndNeverExpandsOwnership() throws Exception {
        var secondProperty = property(ownerA);
        var second = apartment(secondProperty, "Second property", "6000000", Apartment.PublicationStatus.PUBLISHED);
        String customerToken = bearer(customerA);
        for (var a : List.of(apartment, second, otherApartment))
            mvc.perform(post("/api/v1/apartments/" + a.getId() + "/rental-requests").header("Authorization", customerToken)
                    .contentType("application/json").content("{\"message\":\"Property filter test\"}"))
                    .andExpect(status().isCreated());
        String ownerToken = bearer(ownerA);
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", ownerToken).param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", ownerToken)
                .param("propertyId", secondProperty.getId().toString()).param("size", "1").param("status", "PENDING"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1)).andExpect(jsonPath("$.items[0].apartmentId").value(second.getId().toString()));
        for (var id : List.of(otherApartment.getProperty().getId(), UUID.randomUUID()))
            mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", ownerToken).param("propertyId", id.toString()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", ownerToken)
                .param("propertyId", secondProperty.getId().toString()).param("apartmentId", apartment.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }
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
    @Test void bedroomAndRentFiltersCombineBeforePaginationAndSupportStudio() throws Exception {
        apartment.setBedrooms(0); apartments.saveAndFlush(apartment);
        otherApartment.setBedrooms(2); apartments.saveAndFlush(otherApartment);
        hidden.setBedrooms(0); apartments.saveAndFlush(hidden);
        mvc.perform(get("/api/v1/apartments").param("q", marker).param("city", "Test City")
                .param("bedrooms", "0").param("minRent", "5000000").param("maxRent", "5000000").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].id").value(apartment.getId().toString()));
        mvc.perform(get("/api/v1/apartments").param("q", marker).param("bedrooms", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].id").value(otherApartment.getId().toString()));
        mvc.perform(get("/api/v1/apartments").param("q", marker).param("bedrooms", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void invalidBedroomAndRentFiltersAreRejected() throws Exception {
        for (String value : List.of("-1", "1.5", "many", "2147483648")) {
            mvc.perform(get("/api/v1/apartments").param("bedrooms", value)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/v1/apartments").param("minRent", "10").param("maxRent", "9")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/apartments").param("minRent", "-1")).andExpect(status().isBadRequest());
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
        ownerA.setContactVerified(false);ownerA.setEmailVerified(false); accounts.saveAndFlush(ownerA);
        mvc.perform(get("/api/v1/apartments/" + apartment.getId())).andExpect(status().isNotFound());
        ownerA.setContactVerified(true);ownerA.setEmailVerified(true); ownerA.setStatus(AuthAccount.Status.LOCKED); accounts.saveAndFlush(ownerA);
        mvc.perform(get("/api/v1/apartments/" + apartment.getId())).andExpect(status().isNotFound());
    }
    @Test void guestsAndUnverifiedCustomersCannotSubmitButCanBrowse() throws Exception {
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        customerA.setStatus(AuthAccount.Status.PENDING_VERIFICATION); customerA.setContactVerified(false);customerA.setEmailVerified(false); accounts.saveAndFlush(customerA);
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
    @Test void duplicateLookupCancelAndResubmitArePersistedAndPrivate() throws Exception {
        String token = bearer(customerA), url = "/api/v1/apartments/" + apartment.getId() + "/rental-requests";
        mvc.perform(post(url).header("Authorization", token).contentType("application/json").content("{}"))
                .andExpect(status().isCreated());
        em.flush(); em.clear();
        mvc.perform(post(url).header("Authorization", token).contentType("application/json").content("{}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RENTAL_REQUEST_EXISTS"));
        String lookup = "/api/v1/me/apartments/" + apartment.getId() + "/rental-requests";
        mvc.perform(get(lookup).header("Authorization", token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get(lookup).header("Authorization", bearer(customerB))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        var request = requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(customerA.getId(), apartment.getId(), List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();
        String cancel = "/api/v1/me/rental-requests/" + request.getId() + "/cancel";
        mvc.perform(post(cancel).header("Authorization", bearer(customerB)).contentType("application/json").content("{\"version\":0}"))
                .andExpect(status().isNotFound());
        mvc.perform(post(cancel).header("Authorization", token).contentType("application/json").content("{\"version\":99}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));
        mvc.perform(post(cancel).header("Authorization", token).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(cancel).header("Authorization", token).contentType("application/json").content("{\"version\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(jsonPath("$.version").value(1));
        em.flush(); em.clear();
        mvc.perform(get(lookup).header("Authorization", token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post(cancel).header("Authorization", token).contentType("application/json").content("{\"version\":1}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REQUEST_NOT_PENDING"));
        mvc.perform(post(url).header("Authorization", token).contentType("application/json").content("{}"))
                .andExpect(status().isCreated());
        assertEquals(Apartment.Availability.VACANT, apartments.findById(apartment.getId()).orElseThrow().getAvailability());
    }
    @Test void acceptedAndRejectedRequestsCannotBeCancelled() throws Exception {
        String token = bearer(customerA);
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", token).contentType("application/json").content("{}"))
                .andExpect(status().isCreated());
        var request = requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(customerA.getId(), apartment.getId(), List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();
        for (var state : List.of(com.ancu.proptech.model.rental.RentalRequest.Status.ACCEPTED, com.ancu.proptech.model.rental.RentalRequest.Status.REJECTED)) {
            request.setStatus(state); requests.saveAndFlush(request);
            mvc.perform(post("/api/v1/me/rental-requests/" + request.getId() + "/cancel").header("Authorization", token)
                    .contentType("application/json").content("{\"version\":" + request.getVersion() + "}"))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REQUEST_NOT_PENDING"));
            if (state == com.ancu.proptech.model.rental.RentalRequest.Status.ACCEPTED)
                mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests").header("Authorization", token).contentType("application/json").content("{}"))
                        .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RENTAL_REQUEST_EXISTS"));
        }
    }

    @Test void searchExcludesOccupiedAndContractInProgressBeforeCountingAndPaging() throws Exception {
        apartment.setAvailability(Apartment.Availability.OCCUPIED); apartments.saveAndFlush(apartment);
        mvc.perform(get("/api/v1/apartments").param("q",marker).param("size","1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].id").value(otherApartment.getId().toString()));
        otherApartment.setAvailability(Apartment.Availability.CONTRACT_IN_PROGRESS);apartments.saveAndFlush(otherApartment);
        mvc.perform(get("/api/v1/apartments").param("q",marker)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0)).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/apartments/"+apartment.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.availability").value("OCCUPIED"));
    }
    @Test void summaryFlagOrPhoneDoesNotGrantCustomerRentalAccessWithoutVerifiedEmail() throws Exception {
        customerA.setEmailVerified(false);customerA.setPhoneVerified(true);customerA.setContactVerified(true);accounts.saveAndFlush(customerA);
        String token=bearer(customerA);
        mvc.perform(get("/api/v1/me").header("Authorization",token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.contactVerificationStatus").value("UNVERIFIED"));
        mvc.perform(post("/api/v1/apartments/"+apartment.getId()+"/rental-requests").header("Authorization",token)
                .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CONTACT_NOT_VERIFIED"));
    }

    @Test void ownerCanAcceptPendingRentalRequestSettingApartmentToContractInProgress() throws Exception {
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests")
                .header("Authorization", bearer(customerA)).contentType("application/json").content("{\"message\":\"Thuê ngay\"}"))
                .andExpect(status().isCreated());
        var request = requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(
                customerA.getId(), apartment.getId(), List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();

        String decisionUrl = "/api/v1/owner/rental-requests/" + request.getId() + "/decisions";
        mvc.perform(post(decisionUrl).header("Authorization", bearer(ownerA)).contentType("application/json")
                .content("{\"decision\":\"ACCEPT\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.version").value(1));

        var updatedApartment = apartments.findById(apartment.getId()).orElseThrow();
        assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS, updatedApartment.getAvailability());

        // Already accepted request cannot be decided again
        mvc.perform(post(decisionUrl).header("Authorization", bearer(ownerA)).contentType("application/json")
                .content("{\"decision\":\"ACCEPT\",\"version\":1}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REQUEST_NOT_PENDING"));

        // New submission on contract_in_progress apartment is rejected
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests")
                .header("Authorization", bearer(customerB)).contentType("application/json").content("{}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("APARTMENT_NOT_AVAILABLE"));
    }

    @Test void ownerCanRejectPendingRentalRequestPreservingVacantAndSyncingWithCustomer() throws Exception {
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests")
                .header("Authorization", bearer(customerA)).contentType("application/json").content("{\"message\":\"Xin thuê\"}"))
                .andExpect(status().isCreated());
        var request = requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(
                customerA.getId(), apartment.getId(), List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();

        String decisionUrl = "/api/v1/owner/rental-requests/" + request.getId() + "/decisions";
        mvc.perform(post(decisionUrl).header("Authorization", bearer(ownerA)).contentType("application/json")
                .content("{\"decision\":\"REJECT\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.version").value(1));

        // Apartment remains VACANT
        var updatedApartment = apartments.findById(apartment.getId()).orElseThrow();
        assertEquals(Apartment.Availability.VACANT, updatedApartment.getAvailability());

        // Customer sees REJECTED in /me/rental-requests
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization", bearer(customerA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].status").value("REJECTED"));

        // Customer can re-submit since previous was rejected
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests")
                .header("Authorization", bearer(customerA)).contentType("application/json").content("{\"message\":\"Gửi lại\"}"))
                .andExpect(status().isCreated());
    }

    @Test void ownerDecisionValidatesPermissionsAndVersion() throws Exception {
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests")
                .header("Authorization", bearer(customerA)).contentType("application/json").content("{}"))
                .andExpect(status().isCreated());
        var request = requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(
                customerA.getId(), apartment.getId(), List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();

        String decisionUrl = "/api/v1/owner/rental-requests/" + request.getId() + "/decisions";

        // Customer cannot decide
        mvc.perform(post(decisionUrl).header("Authorization", bearer(customerA)).contentType("application/json")
                .content("{\"decision\":\"ACCEPT\",\"version\":0}"))
                .andExpect(status().isForbidden());

        // Different owner cannot decide
        mvc.perform(post(decisionUrl).header("Authorization", bearer(ownerB)).contentType("application/json")
                .content("{\"decision\":\"ACCEPT\",\"version\":0}"))
                .andExpect(status().isNotFound());

        // Stale version
        mvc.perform(post(decisionUrl).header("Authorization", bearer(ownerA)).contentType("application/json")
                .content("{\"decision\":\"ACCEPT\",\"version\":99}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));
    }

    @Test void ownerInboxPrioritizesPendingRequestsThenCreatedAt() throws Exception {
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests")
                .header("Authorization", bearer(customerA)).contentType("application/json").content("{\"message\":\"Yêu cầu cũ\"}"))
                .andExpect(status().isCreated());
        var req1 = requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(
                customerA.getId(), apartment.getId(), List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();

        // Owner rejects req1 -> now it is REJECTED
        mvc.perform(post("/api/v1/owner/rental-requests/" + req1.getId() + "/decisions")
                .header("Authorization", bearer(ownerA)).contentType("application/json")
                .content("{\"decision\":\"REJECT\",\"version\":0}"))
                .andExpect(status().isOk());

        // Customer B sends newer request -> status is PENDING
        mvc.perform(post("/api/v1/apartments/" + apartment.getId() + "/rental-requests")
                .header("Authorization", bearer(customerB)).contentType("application/json").content("{\"message\":\"Yêu cầu mới\"}"))
                .andExpect(status().isCreated());
        var req2 = requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(
                customerB.getId(), apartment.getId(), List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();

        // Query inbox: req2 (PENDING) must be before req1 (REJECTED), even though req1 was created earlier
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization", bearer(ownerA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(req2.getId().toString()))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[1].id").value(req1.getId().toString()))
                .andExpect(jsonPath("$.items[1].status").value("REJECTED"));
    }
    @Test void decisionRejectsNumericUnknownMissingAndOversizedInputsWithoutChangingState() throws Exception {
        mvc.perform(post("/api/v1/apartments/"+apartment.getId()+"/rental-requests").header("Authorization",bearer(customerA)).contentType("application/json").content("{}"));
        var r=requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(customerA.getId(),apartment.getId(),List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();
        String url="/api/v1/owner/rental-requests/"+r.getId()+"/decisions",owner=bearer(ownerA);
        for(String body:List.of("{\"decision\":0,\"version\":0}","{\"decision\":\"ACCEPT\",\"version\":0,\"customerId\":\"spoof\"}","{\"decision\":\"REJECT\"}","{\"decision\":\"REJECT\",\"version\":null}","{\"decision\":\"REJECT\",\"version\":-1}","{\"decision\":\"REJECT\",\"version\":0,\"reason\":\""+"x".repeat(2001)+"\"}"))
            mvc.perform(post(url).header("Authorization",owner).contentType("application/json").content(body)).andExpect(status().isBadRequest());
        assertEquals(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING,requests.findById(r.getId()).orElseThrow().getStatus());
        assertEquals(Apartment.Availability.VACANT,apartments.findById(apartment.getId()).orElseThrow().getAvailability());
    }
    @Test void decisionReasonPersistsAndIsVisibleOnlyInScopedHistoryAndInbox() throws Exception {
        mvc.perform(post("/api/v1/apartments/"+apartment.getId()+"/rental-requests").header("Authorization",bearer(customerA)).contentType("application/json").content("{}"));
        var r=requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(customerA.getId(),apartment.getId(),List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst();
        mvc.perform(post("/api/v1/owner/rental-requests/"+r.getId()+"/decisions").header("Authorization",bearer(ownerA)).contentType("application/json")
            .content("{\"decision\":\"REJECT\",\"version\":0,\"reason\":\"  Không phù hợp thời gian thuê  \"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.decisionReason").value("Không phù hợp thời gian thuê"));
        em.flush();em.clear();
        assertEquals("Không phù hợp thời gian thuê",requests.findById(r.getId()).orElseThrow().getDecisionReason());
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization",bearer(customerA))).andExpect(jsonPath("$.items[0].decisionReason").value("Không phù hợp thời gian thuê"));
        mvc.perform(get("/api/v1/me/rental-requests").header("Authorization",bearer(customerB))).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/owner/rental-requests").header("Authorization",bearer(ownerB))).andExpect(jsonPath("$.items").isEmpty());
    }

    @Test void competingPendingRequestsCannotSelectTheSameApartmentAndOthersStayPending() throws Exception {
        var ids=new ArrayList<UUID>();
        for(var c:List.of(customerA,customerB)) {
            mvc.perform(post("/api/v1/apartments/"+apartment.getId()+"/rental-requests").header("Authorization",bearer(c)).contentType("application/json").content("{}")).andExpect(status().isCreated());
            ids.add(requests.findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(c.getId(),apartment.getId(),List.of(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING)).getFirst().getId());
        }
        String owner=bearer(ownerA);
        mvc.perform(post("/api/v1/owner/rental-requests/"+ids.getFirst()+"/decisions").header("Authorization",owner).contentType("application/json").content("{\"decision\":\"ACCEPT\",\"version\":0}"))
            .andExpect(status().isOk());
        mvc.perform(post("/api/v1/owner/rental-requests/"+ids.getLast()+"/decisions").header("Authorization",owner).contentType("application/json").content("{\"decision\":\"ACCEPT\",\"version\":0}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("APARTMENT_NOT_AVAILABLE"));
        assertEquals(com.ancu.proptech.model.rental.RentalRequest.Status.PENDING,requests.findById(ids.getLast()).orElseThrow().getStatus());
        assertEquals(Apartment.Availability.CONTRACT_IN_PROGRESS,apartments.findById(apartment.getId()).orElseThrow().getAvailability());
    }

}
