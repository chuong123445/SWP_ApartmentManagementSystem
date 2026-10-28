package com.ancu.proptech.dto.apartment;
import com.ancu.proptech.model.apartment.Apartment;
import com.fasterxml.jackson.annotation.*;
import jakarta.validation.constraints.*;
import lombok.*;
@Getter @Setter @NoArgsConstructor
public class ApartmentPublication {
    @NotNull private Apartment.PublicationStatus publicationStatus;
    @NotNull @Min(0) private Long version;
    @JsonSetter("publicationStatus") public void readPublication(Object value){if(!(value instanceof String text))throw new IllegalArgumentException("Invalid publicationStatus");publicationStatus=Apartment.PublicationStatus.valueOf(text);}
    @JsonSetter("version") public void readVersion(Object value){if(!(value instanceof Integer||value instanceof Long))throw new IllegalArgumentException("Invalid version");version=((Number)value).longValue();}
    @JsonAnySetter public void rejectUnknown(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
