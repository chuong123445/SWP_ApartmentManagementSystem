package com.ancu.proptech.dto.auth;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor
public class RegistrationRequest {
    public enum RequestedRole {
        OWNER, CUSTOMER;
        @com.fasterxml.jackson.annotation.JsonCreator
        public static RequestedRole parse(String value) { return valueOf(value); }
    }
    @NotBlank @Email @Size(max=254) private String email;
    @NotBlank @Size(min=12,max=72) private String password;
    @NotBlank @Size(max=100) private String fullName;
    @Size(max=20) private String phone;
    @NotNull private RequestedRole requestedRole;
    @JsonAnySetter public void reject(String field,Object value) {
        throw new IllegalArgumentException("Unsupported registration field: "+field);
    }
}
