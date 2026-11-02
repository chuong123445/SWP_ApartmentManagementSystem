package com.ancu.proptech.dto.auth;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class VneidLinkConfirmationRequest {
    @NotBlank @Size(max=128) private String confirmationId;
    @com.fasterxml.jackson.annotation.JsonAnySetter
    public void reject(String field, Object value) { throw new IllegalArgumentException("Unsupported confirmation field"); }
}
