package com.ancu.proptech.service.apartment;

import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.repository.property.PropertyImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.Locale;

/** Shared by every command that makes an apartment public, including source imports. */
@Service @RequiredArgsConstructor
public class ApartmentPublicationPolicy {
    private final PropertyImageRepository images;

    public void requireReady(Apartment apartment) {
        requirePrices(apartment.getAdvertisedMonthlyRent(), apartment.getElectricityUnitPrice(), apartment.getWaterUnitPrice());
        // Older apartments may have a real room photo in cover_image_path instead of the gallery table.
        String cover = apartment.getCoverImagePath();
        boolean legacyRoomPhoto = cover != null && !cover.isBlank()
                && !cover.toLowerCase(Locale.ROOT).contains("placeholder");
        if (images.unitIds(apartment.getId()).isEmpty() && !legacyRoomPhoto)
            throw incomplete("Cần ít nhất một ảnh riêng của căn/phòng trước khi công khai; ảnh chung của tài sản chưa đủ.");
    }

    public void requirePrices(BigDecimal rent, BigDecimal electricity, BigDecimal water) {
        if (rent == null || rent.signum() <= 0)
            throw incomplete("Cần khai báo giá thuê lớn hơn 0 trước khi công khai căn/phòng.");
        if (!declaredRate(electricity) || !declaredRate(water))
            throw incomplete("Cần khai báo đủ đơn giá điện và nước trước khi công khai. Nhập 0 nếu đã thỏa thuận không thu khoản đó.");
    }

    private static boolean declaredRate(BigDecimal value) { return value != null && value.signum() >= 0; }
    private static ApiException incomplete(String message) {
        return new ApiException(HttpStatus.CONFLICT, "APARTMENT_NOT_READY", message);
    }
}
