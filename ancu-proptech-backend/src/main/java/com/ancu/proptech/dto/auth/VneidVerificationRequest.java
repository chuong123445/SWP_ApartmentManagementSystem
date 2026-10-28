package com.ancu.proptech.dto.auth;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/** Không dùng record/toString để tránh vô tình in token vào log. */
@Getter @Setter
public class VneidVerificationRequest {
    @NotBlank @Size(max=16384) private String auth0AccessToken;
    @com.fasterxml.jackson.annotation.JsonAnySetter
    public void reject(String field, Object value) { throw new IllegalArgumentException("Unsupported verification field"); }
}
