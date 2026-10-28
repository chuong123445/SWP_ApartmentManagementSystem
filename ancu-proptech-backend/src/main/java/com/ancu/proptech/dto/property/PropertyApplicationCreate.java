package com.ancu.proptech.dto.property;
import com.ancu.proptech.model.property.PropertyDossier;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
@Getter @Setter
public class PropertyApplicationCreate extends OwnerPropertyCreate {
    @NotNull private PropertyDossier.RightType rightType;
}
