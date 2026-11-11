package com.ancu.proptech.model.auth;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="action_otp_challenges") @Getter @Setter @NoArgsConstructor
public class ActionOtpChallenge {
    @Id @Column(length=36) private String id;
    @Column(nullable=false) private Long accountId;
    @Column(nullable=false,length=24) private String purpose;
    @Column(nullable=false,length=254) private String targetEmail;
    @Column(nullable=false,length=64) private String bindingHash;
    @Column(nullable=false,length=64) private String codeHash;
    @Column(length=64) private String proofHash;
    @Column(nullable=false) private long accountVersion;
    @Column(nullable=false) private int attempts;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant expiresAt;
    @Column(columnDefinition="datetime2(6)") private Instant verifiedAt;
    @Column(columnDefinition="datetime2(6)") private Instant usedAt;
    @Column(columnDefinition="datetime2(6)") private Instant invalidatedAt;
    @Version private long version;
}
