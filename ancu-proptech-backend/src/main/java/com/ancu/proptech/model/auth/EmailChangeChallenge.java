package com.ancu.proptech.model.auth;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="email_change_challenges") @Getter @Setter @NoArgsConstructor
public class EmailChangeChallenge {
    @Id private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="account_id",nullable=false) private AuthAccount account;
    @Column(nullable=false,length=254) private String targetEmail;
    @Column(nullable=false,length=64) private String codeHash;
    @Column(nullable=false) private long accountVersion;
    @Column(nullable=false) private int attempts;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant expiresAt;
    @Column(columnDefinition="datetime2(6)") private Instant usedAt;
    @Column(columnDefinition="datetime2(6)") private Instant invalidatedAt;
    @Version private long version;
}
