package com.ancu.proptech.model.property;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;


@Entity @Table(name="property_external_imports") @Getter @Setter @NoArgsConstructor
public class PropertyExternalImport {
    @Id private Long propertyId;
    @Column(nullable=false,length=300) private String issuer;
    @org.hibernate.annotations.Nationalized @Column(nullable=false,length=100) private String externalAssetId;
    @Column(nullable=false,length=255) private String subject;
    @Column(nullable=false,length=40) private String source;
    @Column(nullable=false,length=64) private String sourceVersion;
    @Column(nullable=false,columnDefinition="nvarchar(max)") private String sourceSnapshot;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant importedAt;
    @org.hibernate.annotations.Nationalized @Column(length=150) private String bank;
    @Column(length=50) private String accountNumber;
    @org.hibernate.annotations.Nationalized @Column(length=100) private String accountHolderName;
    @Column(columnDefinition="datetime2(6)") private Instant receivingAccountUpdatedAt;
    @Version private long version;
}
