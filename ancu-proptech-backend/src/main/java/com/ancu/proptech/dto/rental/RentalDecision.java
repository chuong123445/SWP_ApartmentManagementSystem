package com.ancu.proptech.dto.rental;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonCreator;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RentalDecision {
    public enum Decision {
        ACCEPT, REJECT;
        @JsonCreator public static Decision parse(String value) { return valueOf(value); }
    }
    @NotNull private Decision decision;
    @Size(max = 2000) private String reason;
    @NotNull @PositiveOrZero private Long version;
    @JsonAnySetter public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unsupported rental decision field");
    }
}
