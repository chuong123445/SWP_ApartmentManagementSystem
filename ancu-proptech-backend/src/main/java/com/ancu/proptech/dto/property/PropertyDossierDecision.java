package com.ancu.proptech.dto.property;
import com.fasterxml.jackson.annotation.*;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class PropertyDossierDecision {
    public enum Decision { APPROVE, REQUEST_ADDITIONAL_INFORMATION, REJECT }
    @NotNull private Decision decision;
    @NotNull @Min(0) private Long version;
    @Size(max=2000) private String reason;
    @JsonSetter("decision") public void readDecision(Object value){if(!(value instanceof String text))throw new IllegalArgumentException("Invalid decision");decision=Decision.valueOf(text);}
    @JsonSetter("version") public void readVersion(Object value){if(!(value instanceof Integer||value instanceof Long))throw new IllegalArgumentException("Invalid version");version=((Number)value).longValue();}
    @JsonAnySetter public void rejectUnknown(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
