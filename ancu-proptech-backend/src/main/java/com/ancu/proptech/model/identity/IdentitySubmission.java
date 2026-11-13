package com.ancu.proptech.model.identity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="account_identity_submissions") @Getter @Setter @NoArgsConstructor
public class IdentitySubmission {
 public enum Status { PENDING, APPROVED, REJECTED }
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,updatable=false) private Long accountId;
 @Column(nullable=false,updatable=false) private long profileVersion;
 @Column(nullable=false,updatable=false,columnDefinition="nvarchar(max)") private String snapshotJson;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Status status=Status.PENDING;
 @Column(nullable=false,updatable=false,columnDefinition="datetime2(6)") private Instant submittedAt;
 private Long reviewerId;
 @Column(columnDefinition="datetime2(6)") private Instant reviewedAt;
 @org.hibernate.annotations.Nationalized @Column(length=2000) private String reason;
 @Version private long version;
}
