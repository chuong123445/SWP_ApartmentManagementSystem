package com.ancu.proptech.controller.messaging;

import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class RentalMessagingIntegrationTests {
    private static final String ROOT = "/api/v1/me/conversations";
    private static final String PASSWORD = "Messaging-test-123!";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;
    @Autowired AuthService auth;
    @Autowired PasswordEncoder encoder;

    @Test void onlyParticipantsCanReadAndReplyAndRetriedMessagesAreUnique() throws Exception {
        var owner = account(AuthAccount.Role.OWNER);
        String ownerToken = token(owner);
        String customer = token(account(AuthAccount.Role.CUSTOMER));
        String stranger = token(account(AuthAccount.Role.CUSTOMER));
        var room = room(owner);
        String open = ROOT + "/apartments/" + room.getId();
        String id = id(mvc.perform(post(open).header("Authorization", customer)).andExpect(status().isOk()));
        mvc.perform(post(open).header("Authorization", customer)).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get(ROOT).header("Authorization", ownerToken)).andExpect(jsonPath("$.totalElements").value(0));

        String thread = ROOT + "/" + id + "/messages";
        mvc.perform(get(thread)).andExpect(status().isUnauthorized());
        mvc.perform(get(thread).header("Authorization", stranger)).andExpect(status().isNotFound());
        send(thread, stranger, UUID.randomUUID(), "Tin nhắn ngoài hội thoại").andExpect(status().isNotFound());
        send(thread, ownerToken, UUID.randomUUID(), "Chưa được khách nhắn").andExpect(status().isNotFound());

        var key = UUID.randomUUID();
        String first = id(send(thread, customer, key, "Cho mình hẹn xem phòng ạ").andExpect(status().isOk()));
        send(thread, customer, key, "Cho mình hẹn xem phòng ạ").andExpect(jsonPath("$.id").value(first));
        send(thread, customer, key, "Nội dung khác").andExpect(status().isConflict());
        send(thread, ownerToken, UUID.randomUUID(), "Chiều nay mình có thể xem nhé").andExpect(status().isOk());
        mvc.perform(get(ROOT).header("Authorization", ownerToken)).andExpect(jsonPath("$.items[0].id").value(id));
        mvc.perform(get(ROOT).header("Authorization", stranger)).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(thread).header("Authorization", customer)).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.messages.length()").value(2))
            .andExpect(jsonPath("$.messages[0].mine").value(true))
            .andExpect(jsonPath("$.messages[0].body").value("Cho mình hẹn xem phòng ạ"))
            .andExpect(jsonPath("$.messages[1].mine").value(false));
        mvc.perform(get(thread).param("after", first).header("Authorization", ownerToken))
            .andExpect(jsonPath("$.messages.length()").value(1)).andExpect(jsonPath("$.messages[0].mine").value(true));
        mvc.perform(get(thread).param("before", first).header("Authorization", customer))
            .andExpect(jsonPath("$.messages.length()").value(0));
    }

    @Test void hiddenRoomCannotStartNewConversation() throws Exception {
        var room = room(account(AuthAccount.Role.OWNER));
        room.setPublicationStatus(Apartment.PublicationStatus.HIDDEN);
        apartments.saveAndFlush(room);
        mvc.perform(post(ROOT + "/apartments/" + room.getId())
            .header("Authorization", token(account(AuthAccount.Role.CUSTOMER)))).andExpect(status().isNotFound());
    }

    private ResultActions send(String url, String token, UUID key, String body) throws Exception {
        return mvc.perform(post(url).header("Authorization", token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("requestKey", key, "body", body))));
    }

    private String id(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsByteArray()).path("id").asString();
    }

    private AuthAccount account(AuthAccount.Role role) {
        var account = new AuthAccount();
        account.setEmail(UUID.randomUUID() + "@example.invalid");
        account.setFullName(role == AuthAccount.Role.OWNER ? "Chủ nhà thử nghiệm" : "Khách thuê thử nghiệm");
        account.setRole(role);
        account.setStatus(AuthAccount.Status.ACTIVE);
        account.setEmailVerified(true);
        account.setContactVerified(true);
        account.setPasswordHash(encoder.encode(PASSWORD));
        return accounts.saveAndFlush(account);
    }

    private String token(AuthAccount account) {
        return "Bearer " + auth.login(account.getEmail(), PASSWORD).tokens().accessToken();
    }

    private Apartment room(AuthAccount owner) {
        var property = new Property();
        property.setOwner(owner);
        property.setName("Tòa thử nghiệm");
        property.setAddress("Địa chỉ thử");
        property.setCity("Đà Nẵng");
        property.setDistrict("Hải Châu");
        property.setApprovalStatus(Property.ApprovalStatus.APPROVED);
        properties.saveAndFlush(property);
        var room = new Apartment();
        room.setProperty(property);
        room.setRoomNumber("101");
        room.setTitle("Phòng 101");
        room.setDescription("Phòng thử nghiệm");
        room.setAdvertisedMonthlyRent(new BigDecimal("4000000"));
        room.setAreaM2(new BigDecimal("25"));
        room.setAvailability(Apartment.Availability.VACANT);
        room.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);
        room.setCreatedAt(Instant.now());
        return apartments.saveAndFlush(room);
    }
}
