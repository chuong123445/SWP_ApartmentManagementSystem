package com.ancu.proptech.model.property;
import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="property_evidence_files") @Getter @Setter @NoArgsConstructor
public class PropertyEvidenceFile {
    public enum Purpose { RIGHT_DOCUMENT, SUPPORTING, OWNER_IDENTITY }
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="property_id",nullable=false) private Property property;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="uploader_id",nullable=false) private AuthAccount uploader;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Purpose purpose;
    @Nationalized @Column(nullable=false,length=150) private String filename;
    @Column(nullable=false,length=50) private String contentType;
    @Column(nullable=false) private long sizeBytes;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
}
