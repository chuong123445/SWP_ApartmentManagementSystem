package com.ancu.proptech.model.auth;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
/** Challenge và quyền một lần; chỉ lưu hash, không lưu token nhà cung cấp. */
@Entity @Table(name="account_reauthentications") @Getter @Setter @NoArgsConstructor
public class AccountReauthentication {
    public enum Purpose { PASSWORD, EMAIL, PHONE }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long accountId;
    @Column(nullable=false) private Long sessionId;
    @Column(nullable=false) private long accountVersion;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private Purpose purpose;
    @Column(nullable=false,length=64) private String nonceHash;
    @Column(length=64) private String credentialHash;
    @Column(length=64) private String proofHash;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant expiresAt;
    @Column(columnDefinition="datetime2(6)") private Instant confirmedAt;
    @Column(columnDefinition="datetime2(6)") private Instant usedAt;
    @Column(nullable=false) private int attempts;
}
