package com.ancu.proptech.dto.billing;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class InvoiceSend {
    @NotNull @Min(0) private Long version;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
