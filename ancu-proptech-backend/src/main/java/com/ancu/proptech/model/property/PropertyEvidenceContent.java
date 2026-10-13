package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
@Entity @Table(name="property_evidence_content") @Getter @Setter @NoArgsConstructor
public class PropertyEvidenceContent {
    @Id private UUID id;
    @Column(nullable=false,columnDefinition="varbinary(max)") private byte[] content;
}
