package com.ancu.proptech.dto.property;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;
import com.ancu.proptech.dto.property.VneidPropertyImportRequest.Unit;
@Getter @Setter @NoArgsConstructor
public class VneidUnitsAppendRequest {
    @NotNull @Min(0) private Long version;
    @NotBlank @Pattern(regexp="[a-f0-9]{64}") private String sourceVersion;
    @NotNull @Size(min=1,max=50) private List<@NotNull @Valid Unit> units;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
