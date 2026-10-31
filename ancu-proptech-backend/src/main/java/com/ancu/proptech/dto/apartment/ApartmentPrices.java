package com.ancu.proptech.dto.apartment;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

/** Giá niêm yết mới, không thay đơn giá đã chốt trong hợp đồng. */
@Getter @Setter @NoArgsConstructor
public class ApartmentPrices {
    @NotNull @Min(0) private Long version;
    @JsonSetter(nulls=Nulls.FAIL) @DecimalMin("0.01") @Digits(integer=13,fraction=2) private BigDecimal monthlyRent;
    @JsonSetter(nulls=Nulls.FAIL) @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal electricityUnitPrice;
    @JsonSetter(nulls=Nulls.FAIL) @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal waterUnitPrice;
    /** Bỏ qua trường không gửi; không tự gán 0 cho giá chưa có. */
    @AssertTrue(message="Cần cung cấp ít nhất một giá hợp lệ.") @JsonIgnore
    public boolean isPriceProvided(){return monthlyRent!=null||electricityUnitPrice!=null||waterUnitPrice!=null;}
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
