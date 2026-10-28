package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="property_evidence_content") @Getter @Setter @NoArgsConstructor
public class PropertyEvidenceContent {
    @Id private Long id;
    @Column(nullable=false,columnDefinition="varbinary(max)") private byte[] content;
}
