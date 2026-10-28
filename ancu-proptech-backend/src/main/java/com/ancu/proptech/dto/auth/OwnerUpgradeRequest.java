package com.ancu.proptech.dto.auth;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
@Getter @Setter
public class OwnerUpgradeRequest {
    @NotNull @AssertTrue private Boolean consent;
    @NotNull @Min(0) private Long version;
    @com.fasterxml.jackson.annotation.JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported owner upgrade field");}
}
