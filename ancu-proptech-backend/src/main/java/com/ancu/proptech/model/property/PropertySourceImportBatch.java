package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** Immutable source evidence for one successful selection of rooms. */
@Entity @Table(name="property_source_import_batches") @Getter @Setter @NoArgsConstructor
public class PropertySourceImportBatch {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long propertyId;
    @Column(nullable=false,length=64) private String sourceVersion;
    @Column(nullable=false,columnDefinition="nvarchar(max)") private String sourceSnapshot;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant importedAt;
    @Column(nullable=false) private boolean legacy;
}
