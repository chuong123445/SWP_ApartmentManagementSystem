package com.ancu.proptech.dto.auth;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
@Getter @Setter @NoArgsConstructor
public class ProfileUpdate {
    @NotBlank @Size(max=100) private String fullName;
    @Past private LocalDate dateOfBirth;
    @Size(max=300) private String address;
    @Size(max=1000) private String bio;
    @NotNull @Min(0) private Long version;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
