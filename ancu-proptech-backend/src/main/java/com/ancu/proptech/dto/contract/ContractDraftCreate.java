package com.ancu.proptech.dto.contract;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter
public class ContractDraftCreate extends ContractTerms {
    @NotNull @PositiveOrZero private Long requestVersion;
    @NotBlank @Pattern(regexp="[a-f0-9]{64}") private String sourceVersion;
    @com.fasterxml.jackson.annotation.JsonSetter("requestVersion") public void readVersion(Object value) {
        if(!(value instanceof Integer || value instanceof Long)) throw new IllegalArgumentException("Invalid requestVersion");
        requestVersion=((Number)value).longValue();
    }
}
