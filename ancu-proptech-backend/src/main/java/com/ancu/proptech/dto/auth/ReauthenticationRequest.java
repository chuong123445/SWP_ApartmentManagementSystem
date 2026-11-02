package com.ancu.proptech.dto.auth;
import com.ancu.proptech.model.auth.AccountReauthentication.Purpose;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class ReauthenticationRequest {
    @NotNull private Purpose purpose;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
