package com.ancu.proptech.dto.contract;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
@Getter @Setter
public class ContractTerms {
    @NotNull @Pattern(regexp="APARTMENT|HOUSE|ROOM|BUSINESS|SHARED") private String templateType = "APARTMENT";
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
    @NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) private BigDecimal monthlyRent;
    @NotNull @PositiveOrZero @Digits(integer=13,fraction=2) private BigDecimal electricityUnitPrice;
    @NotNull @PositiveOrZero @Digits(integer=13,fraction=2) private BigDecimal waterUnitPrice;
    @NotNull @PositiveOrZero @Digits(integer=13,fraction=2) private BigDecimal deposit;
    @NotNull @Min(1) @Max(28) private Integer paymentDay;
    @NotBlank @Size(max=300) private String paymentMethod;
    @NotBlank @Size(max=300) private String usagePurpose;
    @NotNull @Size(min=1,max=30) @Valid private List<@NotNull ContractClause> clauses;
    @com.fasterxml.jackson.annotation.JsonSetter("paymentDay") public void readPaymentDay(Object value) {
        if(!(value instanceof Integer)) throw new IllegalArgumentException("Invalid paymentDay");
        paymentDay=(Integer)value;
    }
    @JsonAnySetter public void rejectUnknown(String field,Object value) { throw new IllegalArgumentException("Unsupported contract term field"); }
}
