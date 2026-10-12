package com.ancu.proptech.dto.auth;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class PhoneChange {
    @Size(max=20) private String phone;
    @NotBlank @Size(max=128) private String currentPassword;
    @NotNull @Min(0) private Long version;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
