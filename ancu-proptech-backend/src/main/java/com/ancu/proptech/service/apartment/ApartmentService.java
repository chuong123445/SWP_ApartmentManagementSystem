package com.ancu.proptech.service.apartment;

import com.ancu.proptech.dto.apartment.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service @RequiredArgsConstructor
public class ApartmentService {
    private final ApartmentRepository apartments;

    public static Specification<Apartment> visible() {
        return (root, query, cb) -> {
            var property = root.join("property");
            var owner = property.join("owner");
            return cb.and(cb.equal(root.get("publicationStatus"), Apartment.PublicationStatus.PUBLISHED),
                    cb.equal(property.get("approvalStatus"), Property.ApprovalStatus.APPROVED),
                    cb.equal(owner.get("status"), AuthAccount.Status.ACTIVE), cb.isTrue(owner.get("contactVerified")),
                    cb.equal(owner.get("role"), AuthAccount.Role.OWNER));
        };
    }

    @Transactional(readOnly = true)
    public PageResponse<ApartmentSummary> search(String q, String city, String district, String ward, BigDecimal minRent, BigDecimal maxRent, int page, int size) {
        validatePage(page, size);
        if ((q != null && q.length() > 120) || (city != null && city.length() > 80) || (district != null && district.length() > 80) || (ward != null && ward.length() > 80)
                || (minRent != null && minRent.signum() < 0) || (maxRent != null && maxRent.signum() < 0)
                || (minRent != null && maxRent != null && minRent.compareTo(maxRent) > 0))
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Bộ lọc căn hộ không hợp lệ.");
        Specification<Apartment> filters = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_").replace("[", "\\[") + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("title")), pattern, '\\'), cb.like(cb.lower(root.get("property").get("address")), pattern, '\\')));
            }
            if (city != null && !city.isBlank()) predicates.add(cb.equal(root.get("property").get("city"), city.strip()));
            if (district != null && !district.isBlank()) predicates.add(cb.equal(root.get("property").get("district"), district.strip()));
            if (ward != null && !ward.isBlank()) predicates.add(cb.equal(root.get("property").get("ward"), ward.strip()));
            if (minRent != null) predicates.add(cb.greaterThanOrEqualTo(root.get("advertisedMonthlyRent"), minRent));
            if (maxRent != null) predicates.add(cb.lessThanOrEqualTo(root.get("advertisedMonthlyRent"), maxRent));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageResponse.from(apartments.findAll(visible().and(filters), PageRequest.of(page, size, Sort.by("createdAt", "id"))).map(this::summary));
    }

    @Transactional(readOnly = true)
    public ApartmentDetail detail(UUID id) {
        Apartment a = apartments.findOne(visible().and((root, query, cb) -> cb.equal(root.get("id"), id)))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy căn hộ đang được đăng công khai."));
        var p = a.getProperty();
        var owner = p.getOwner();
        return new ApartmentDetail(a.getId(), a.getTitle(), a.getDescription(), p.getAddress(), p.getCity(), p.getDistrict(), p.getName(),
                a.getAreaM2().toPlainString(), a.getAdvertisedMonthlyRent().toPlainString(), List.of(image(a)),
                List.copyOf(a.getAmenities()), a.getAvailability().name(), a.getPublicationStatus().name(), a.getBedrooms(), a.getBathrooms(),
                new ApartmentDetail.PublicOwner(owner.getId(), owner.getFullName(), owner.isContactVerified()), a.getVersion());
    }

    public static void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Phân trang không hợp lệ.");
    }
    @Transactional(readOnly=true)
    public List<AddressOption> addressOptions() {
        return apartments.addressOptions(Apartment.PublicationStatus.PUBLISHED,Property.ApprovalStatus.APPROVED,AuthAccount.Status.ACTIVE,AuthAccount.Role.OWNER);
    }
    private ApartmentSummary summary(Apartment a) {
        var p = a.getProperty();
        return new ApartmentSummary(a.getId(), a.getTitle(), p.getAddress(), p.getCity(), p.getDistrict(),
                a.getAreaM2().toPlainString(), a.getAdvertisedMonthlyRent().toPlainString(), image(a), a.getAvailability().name(), a.getBedrooms(), a.getBathrooms());
    }
    private static String image(Apartment a) { return a.getCoverImagePath() == null ? "/images/apartment-placeholder.svg" : a.getCoverImagePath(); }
}
