package com.ancu.proptech.dto.contract;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
public record ContractClause(@NotBlank @Size(max=150) String title, @NotBlank @Size(max=4000) String body) {
    @JsonAnySetter public void rejectUnknown(String field,Object value) { throw new IllegalArgumentException("Unsupported clause field"); }
}
