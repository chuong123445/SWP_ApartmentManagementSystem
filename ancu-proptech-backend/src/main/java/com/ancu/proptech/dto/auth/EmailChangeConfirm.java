package com.ancu.proptech.dto.auth;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class EmailChangeConfirm {
    @NotNull @Pattern(regexp="[0-9]{6}") private String code;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
