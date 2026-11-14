package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="property_document_checks") @Getter @Setter @NoArgsConstructor
public class PropertyDocumentCheck {
 @Id private Long fileId;
 @Column(nullable=false) private Long propertyId;
 @Column(nullable=false,length=24) private String purpose;
 @Column(nullable=false) private boolean accepted;
 @Column(nullable=false,length=36) private String scanToken;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant checkedAt;
 @Version private long version;
}
