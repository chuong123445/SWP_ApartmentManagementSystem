package com.ancu.proptech.dto.rental;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;
@Getter @Setter
public class RentalRequestCancel {
    @NotNull @PositiveOrZero private Long version;
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported rental request field"); }
}
