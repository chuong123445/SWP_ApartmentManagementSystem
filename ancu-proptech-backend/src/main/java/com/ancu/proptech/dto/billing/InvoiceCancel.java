package com.ancu.proptech.dto.billing;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor
public class InvoiceCancel {
    @NotNull @Min(0) private Long version;
    @NotNull @Min(0) private Long billingVersion;
    @NotBlank @Size(max=1000) private String reason;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
