package com.ancu.proptech.dto.contract;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter
public class ContractDraftUpdate extends ContractTerms {
    @NotNull @PositiveOrZero private Long version;
    @com.fasterxml.jackson.annotation.JsonSetter("version") public void readVersion(Object value) {
        if(!(value instanceof Integer || value instanceof Long)) throw new IllegalArgumentException("Invalid version");
        version=((Number)value).longValue();
    }
}
