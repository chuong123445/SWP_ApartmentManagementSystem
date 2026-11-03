package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** Stable source identity, independent of room display code or publication. */
@Entity @Table(name="property_source_units",uniqueConstraints=@UniqueConstraint(name="uq_property_source_unit",columnNames={"property_id","external_unit_id"}))
@Getter @Setter @NoArgsConstructor
public class PropertySourceUnit {
    @Id private Long apartmentId;
    @Column(nullable=false) private Long propertyId;
    @org.hibernate.annotations.Nationalized @Column(nullable=false,length=100) private String externalUnitId;
    @Column(nullable=false) private Long batchId;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant importedAt;
}
