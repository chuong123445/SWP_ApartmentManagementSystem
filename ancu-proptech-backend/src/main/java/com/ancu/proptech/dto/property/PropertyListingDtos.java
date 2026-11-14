package com.ancu.proptech.dto.property;
import com.ancu.proptech.model.property.PropertyDossier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import tools.jackson.databind.JsonNode;
import java.util.List;
public final class PropertyListingDtos {
    private PropertyListingDtos(){}
    public record Start(@NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}") String requestKey,@NotNull PropertyDossier.RightType rightType){}
    public record Save(@NotNull @Min(0) Long version,@NotNull JsonNode payload){}
    public record Finish(@NotNull @Min(0) Long version,@NotNull @Valid OwnerPropertyCreate property,@NotNull @Valid PropertyDossierSubmit dossier,@NotNull Boolean submit){}
    public record View(String propertyId,long version,long propertyVersion,String rightType,boolean completed,JsonNode payload,List<PropertyEvidenceResponse> files){}
}
