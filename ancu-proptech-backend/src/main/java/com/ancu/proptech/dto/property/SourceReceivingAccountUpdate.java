package com.ancu.proptech.dto.property;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class SourceReceivingAccountUpdate {
    @NotBlank @Size(max=150) private String bank;
    @NotBlank @Pattern(regexp="[0-9A-Za-z-]{4,50}") private String accountNumber;
    @NotBlank @Size(max=100) private String accountHolderName;
    @NotNull @Min(0) private Long version;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
