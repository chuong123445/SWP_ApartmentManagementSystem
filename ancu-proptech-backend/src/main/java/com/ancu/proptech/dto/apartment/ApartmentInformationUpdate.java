package com.ancu.proptech.dto.apartment;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;
@Getter @Setter @NoArgsConstructor
public class ApartmentInformationUpdate {
    @NotNull @Min(0) private Long version;
    @NotBlank @Size(max=150) private String title;
    @NotNull @Size(max=3000) private String description;
    @NotNull @Min(1) @Max(1000) private Integer maxOccupants;
    @NotNull @Size(max=30) private List<@NotBlank @Size(max=100) String> amenities;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
