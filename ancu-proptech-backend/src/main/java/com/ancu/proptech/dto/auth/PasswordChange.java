package com.ancu.proptech.dto.auth;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class PasswordChange {
    @Size(max=128) private String currentPassword;
    @Size(max=200) private String reauthenticationProof;
    @NotBlank @Size(min=12,max=128) private String newPassword;
    @NotNull @Min(0) private Long version;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
