package com.ancu.proptech.dto.identity;
import com.fasterxml.jackson.annotation.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor
public class IdentityProfileInput {
    @NotBlank @Size(max=100) private String legalName;
    @NotBlank @Pattern(regexp="[0-9]{12}") private String documentNumber;
    @NotNull @Past private LocalDate dateOfBirth;
    @NotNull @PastOrPresent private LocalDate issueDate;
    @NotBlank @Size(max=200) private String issuePlace;
    @NotBlank @Size(max=500) private String permanentAddress;
    @NotBlank @Size(max=500) private String currentAddress;
    @PositiveOrZero private Long version;
    @JsonSetter("version") public void readVersion(Object value) {
        if(value==null){version=null;return;}
        if(!(value instanceof Integer || value instanceof Long))throw new IllegalArgumentException("Invalid version");
        version=((Number)value).longValue();
    }
    @JsonAnySetter public void rejectUnknown(String field,Object value){throw new IllegalArgumentException("Unsupported identity field");}
}
