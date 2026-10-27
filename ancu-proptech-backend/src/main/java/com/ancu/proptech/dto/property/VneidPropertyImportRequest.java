package com.ancu.proptech.dto.property;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class VneidPropertyImportRequest {
    @NotBlank @Size(max=100) private String externalAssetId;
    @NotBlank @Pattern(regexp="[a-f0-9]{64}") private String sourceVersion;
    @NotBlank @Size(max=80) private String city;
    @NotBlank @Size(max=80) private String district;
    @Size(max=80) private String ward;
    @NotNull @Size(min=1,max=50) private List<@NotNull @Valid Unit> units;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
    @Getter @Setter @NoArgsConstructor
    public static class Unit {
        @NotBlank @Size(max=100) private String externalUnitId;
        @NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) private BigDecimal monthlyRent;
        @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal deposit;
        @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal electricityUnitPrice;
        @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) private BigDecimal waterUnitPrice;
        @NotNull @Min(0) private Integer electricityIndex;
        @NotNull @Min(0) private Integer waterIndex;
        @NotNull @Min(0) @Max(200) private Integer floor;
        @NotNull @Min(1) @Max(1000) private Integer maxOccupants;
        @NotNull @Size(max=3000) private String description="";
        @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
    }
}
