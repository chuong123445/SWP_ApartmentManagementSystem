package com.ancu.proptech.dto.property;
import com.ancu.proptech.model.property.PropertyDossier;
import com.fasterxml.jackson.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.*;
import java.time.LocalDate;
@Getter @Setter @NoArgsConstructor
public class PropertyDossierSubmit {
    @NotNull @Min(0) private Long propertyVersion;
    @NotNull private PropertyDossier.RightType rightType;
    @NotNull @Valid private ReceivingAccount receivingAccount;
    @NotNull @Size(min=1,max=20) private List<@NotNull UUID> documentFileIds;
    @NotNull @Size(max=20) private List<@NotNull UUID> supportingFileIds=new ArrayList<>();
    @NotNull @Size(max=20) private List<@NotNull UUID> ownerEvidenceFileIds=new ArrayList<>();
    @Size(max=100) private String certificateNumber;
    @PastOrPresent private LocalDate certificateIssueDate;
    @Size(max=200) private String certificateIssuePlace;
    @Size(max=1000) private String exploitationRightDescription;
    @AssertTrue public boolean isCertificateComplete(){
        boolean number=certificateNumber!=null&&!certificateNumber.isBlank(),place=certificateIssuePlace!=null&&!certificateIssuePlace.isBlank();
        return (!number&&certificateIssueDate==null&&!place)||(number&&certificateIssueDate!=null&&place);
    }
    @JsonSetter("rightType") public void readRightType(Object value){if(!(value instanceof String text))throw new IllegalArgumentException("Invalid rightType");rightType=PropertyDossier.RightType.valueOf(text);}
    @JsonSetter("propertyVersion") public void readVersion(Object value){if(!(value instanceof Integer||value instanceof Long))throw new IllegalArgumentException("Invalid propertyVersion");propertyVersion=((Number)value).longValue();}
    @JsonAnySetter public void rejectUnknown(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
    @Getter @Setter @NoArgsConstructor public static class ReceivingAccount {
        @NotBlank @Size(max=100) private String bank;
        @NotBlank @Pattern(regexp="[0-9]{4,40}") private String accountNumber;
        @NotBlank @Size(max=100) private String accountHolderName;
        @JsonAnySetter public void rejectUnknown(String field,Object value){throw new IllegalArgumentException("Unsupported field: "+field);}
    }
}
