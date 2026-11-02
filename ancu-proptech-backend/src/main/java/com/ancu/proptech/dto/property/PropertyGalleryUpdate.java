package com.ancu.proptech.dto.property;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;
@Getter @Setter @NoArgsConstructor
public class PropertyGalleryUpdate {
    @NotNull @Min(0) private Long version;
    @NotNull @Size(min=1,max=4) private List<@NotNull Long> imageIds;
    @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
}
