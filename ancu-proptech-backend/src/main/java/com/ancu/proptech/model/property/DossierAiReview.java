package com.ancu.proptech.model.property;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import org.hibernate.annotations.Nationalized;

@Entity @Table(name="property_dossier_ai_reviews") @Getter @Setter @NoArgsConstructor
public class DossierAiReview {
    public enum State { QUEUED, WAITING_CONFIGURATION, RUNNING, COMPLETED, FAILED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,unique=true) private Long dossierId;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=32) private State state;
    @Nationalized @Column(nullable=false,columnDefinition="nvarchar(max)") private String sourceJson;
    @Column(nullable=false,length=64) private String sourceHash;
    @Nationalized @Column(columnDefinition="nvarchar(max)") private String resultJson;
    @Column(length=100) private String model;
    @Column(nullable=false,length=40) private String promptVersion;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(columnDefinition="datetime2(6)") private Instant startedAt;
    @Column(columnDefinition="datetime2(6)") private Instant finishedAt;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant nextAttemptAt;
    @Column(nullable=false) private int attempts;
    @Column(length=40) private String errorCode;
    @Column(length=36) private String runToken;
    @Version private long version;
}
