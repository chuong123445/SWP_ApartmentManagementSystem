package com.ancu.proptech.dto.auth;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class PasswordChange {
    @NotBlank @Size(max=128) private String currentPassword;
    @NotBlank @Size(min=12,max=128) private String newPassword;
    @NotNull @Min(0) private Long version;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
