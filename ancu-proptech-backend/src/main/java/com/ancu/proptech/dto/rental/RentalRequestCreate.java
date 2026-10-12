package com.ancu.proptech.dto.rental;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
@Getter @Setter
public class RentalRequestCreate {
    @Size(max = 2000) private String message;
    @JsonAnySetter
    public void rejectReadonlyField(String field, Object value) { throw new IllegalArgumentException("Unsupported rental request field"); }
}
