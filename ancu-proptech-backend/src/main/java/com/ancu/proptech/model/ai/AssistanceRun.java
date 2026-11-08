package com.ancu.proptech.model.ai;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="ai_assistance_runs") @Getter @Setter @NoArgsConstructor
public class AssistanceRun {
 @Id @Column(length=36) private String id;
 @Column(nullable=false,length=32) private String task;
 private Long accountId;private Long propertyId;
 @Column(nullable=false,length=64) private String sourceHash;
 @Column(nullable=false,length=100) private String model;
 @Column(nullable=false,length=64) private String promptVersion;
 @Column(nullable=false,length=32) private String status;
 @Column(length=64) private String errorCode;
 @Column(columnDefinition="nvarchar(max)") private String resultJson;
 @Column(columnDefinition="nvarchar(max)") private String acceptedJson;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
 @Column(columnDefinition="datetime2(6)") private Instant finishedAt;
 @Column(columnDefinition="datetime2(6)") private Instant acceptedAt;
 @Version private long version;
}
