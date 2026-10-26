package com.ancu.proptech.service.bootstrap;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class LocalDataService {
    private final AuthAccountRepository accounts;
    private final PropertyRepository properties;
    private final ApartmentRepository apartments;
    private final RentalRequestRepository requests;
    private final PasswordEncoder passwords;

    // Never fill/overwrite partial or existing datasets. Auth accounts/legacy rooms are preserved.
    @Transactional
    public synchronized boolean initializeIfEmpty(String ownerEmail, String ownerPassword, String customerEmail, String customerPassword) {
        if (properties.count() != 0 || apartments.count() != 0 || requests.count() != 0) return false;
        AuthAccount owner = account(ownerEmail, ownerPassword, AuthAccount.Role.OWNER, "Chủ nhà An Cư");
        account(customerEmail, customerPassword, AuthAccount.Role.CUSTOMER, "Khách thuê An Cư");
        Property central = property(owner, "An Cư Lê Văn Sỹ", "123 Lê Văn Sỹ, TP. Hồ Chí Minh", "Quận 3");
        Property east = property(owner, "An Cư Thủ Đức", "28 Đường số 2, TP. Hồ Chí Minh", "Thủ Đức");
        String[] titles = {"Studio thoáng sáng — A.101", "Studio có ban công — A.102", "Căn hộ 1 phòng ngủ — A.201", "Căn hộ 1 phòng ngủ — A.202", "Căn hộ 2 phòng ngủ — B.101", "Căn hộ gia đình — B.201", "Căn hộ rộng thoáng — B.202", "Căn hộ chưa đăng — B.301"};
        int[] prices = {4500000, 5000000, 6500000, 7000000, 8500000, 11500000, 12000000, 9000000};
        int[] areas = {24, 28, 36, 40, 45, 60, 65, 50};
        String[] sampleImages = {
            "/apartment/images/apartment1.jpg",
            "/apartment/images/department2.jpg",
            "/apartment/images/apartment3.jpg",
            "/apartment/images/apartment4.jpg",
            "/apartment/images/department5.webp"
        };
        for (int i = 0; i < titles.length; i++) {
            Apartment apartment = new Apartment();
            apartment.setProperty(i < 4 ? central : east);
            apartment.setTitle(titles[i]);
            apartment.setRoomNumber(titles[i].substring(titles[i].lastIndexOf(" — ") + 3));
            apartment.setFloor(Character.digit(apartment.getRoomNumber().charAt(2), 10));
            apartment.setMaxOccupants(2);
            apartment.setDescription("Căn hộ mẫu với không gian riêng tư, khu bếp và phòng tắm. Thuận tiện đi lại, phù hợp ở lâu dài. Giá niêm yết chưa bao gồm điện nước theo hợp đồng.");
            apartment.setAreaM2(BigDecimal.valueOf(areas[i]));
            apartment.setAdvertisedMonthlyRent(BigDecimal.valueOf(prices[i]));
            apartment.setBedrooms(i < 2 ? 0 : i < 4 ? 1 : 2);
            apartment.setBathrooms(1);
            apartment.setCoverImagePath(sampleImages[i % sampleImages.length]);
            apartment.setAmenities(new ArrayList<>(List.of("Máy lạnh", "Khu bếp", "Phòng tắm riêng", "Chỗ để xe")));
            apartment.setPublicationStatus(i == 7 ? Apartment.PublicationStatus.DRAFT : Apartment.PublicationStatus.PUBLISHED);
            apartment.setAvailability(Apartment.Availability.VACANT);
            apartment.setCreatedAt(Instant.now());
            apartments.save(apartment);
        }
        return true;
    }

    private AuthAccount account(String email, String password, AuthAccount.Role role, String name) {
        if (email == null || email.isBlank()) throw new IllegalStateException("Configure local seed account emails.");
        String normalized = email.strip().toLowerCase(Locale.ROOT);
        Optional<AuthAccount> existing = accounts.findByEmail(normalized);
        if (existing.isPresent()) {
            AuthAccount a = existing.get();
            if (a.getRole() != role || a.getStatus() == AuthAccount.Status.LOCKED || a.getStatus() == AuthAccount.Status.INACTIVE || (role == AuthAccount.Role.OWNER && (a.getStatus() != AuthAccount.Status.ACTIVE || !a.isContactVerified())))
                throw new IllegalStateException("Existing account is not eligible for local sample data; disable APP_SEED_DATA or configure another local account.");
            return a;
        }
        if (password == null || password.length() < 12) throw new IllegalStateException("Configure local seed passwords with at least 12 characters.");
        AuthAccount a = new AuthAccount();
        a.setEmail(normalized);
        a.setPasswordHash(passwords.encode(password));
        a.setFullName(name);
        a.setRole(role);
        boolean ownerFixture = role == AuthAccount.Role.OWNER;
        a.setStatus(ownerFixture ? AuthAccount.Status.ACTIVE : AuthAccount.Status.PENDING_VERIFICATION);
        a.setContactVerified(ownerFixture); // Only Owner catalog fixture has sample verification.
        a.setEmailVerified(ownerFixture);
        return accounts.save(a);
    }

    private Property property(AuthAccount owner, String name, String address, String district) {
        Property p = new Property();
        p.setOwner(owner); p.setName(name); p.setAddress(address); p.setCity("TP. Hồ Chí Minh"); p.setDistrict(district);
        p.setApprovalStatus(Property.ApprovalStatus.APPROVED); // Representative approved local fixture, not an admin review integration.
        return properties.save(p);
    }
}
