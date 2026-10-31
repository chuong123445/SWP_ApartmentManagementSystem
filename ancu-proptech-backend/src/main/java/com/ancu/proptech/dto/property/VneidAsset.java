package com.ancu.proptech.dto.property;

import java.math.BigDecimal;
import java.util.List;

/** Snapshot nguồn riêng tư; không chứa token hoặc thông tin đăng nhập. */
public record VneidAsset(String externalAssetId, String name, String address, String rentalMode,
                         String certificateNumber, String certificateDate, String certificatePlace, List<Unit> units,
                         String rightDescription) {
    public VneidAsset(String id,String name,String address,String mode,String number,String date,String place,List<Unit> units) {
        this(id,name,address,mode,number,date,place,units,null);
    }
    public record Unit(String externalUnitId, String code, BigDecimal areaM2, Integer bedrooms, Integer bathrooms) {}
}
