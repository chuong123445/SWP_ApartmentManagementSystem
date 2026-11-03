package com.ancu.proptech.dto.auth;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor
public class VneidContactInput {
    @NotBlank @Email @Size(max=254) private String email;
    @NotBlank @Size(max=20) private String phone;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported contact field: "+field);}
}
