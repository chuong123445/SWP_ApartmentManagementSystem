package com.ancu.proptech.dto.auth;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class ReauthenticationConfirm {
    @NotBlank @Pattern(regexp="AUTH0|GOOGLE") private String provider;
    @NotBlank @Size(max=16384) private String credential;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
