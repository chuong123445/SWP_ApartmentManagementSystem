package com.ancu.proptech.model.auth;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.*;
import java.util.UUID;

/** Bằng chứng tài khoản riêng, không thay hồ sơ ảnh CCCD tự khai. */
@Entity @Table(name="auth_external_identities") @Getter @Setter @NoArgsConstructor
public class ExternalIdentity {
    @Id private UUID accountId;
    @Column(nullable=false,length=255) private String issuer;
    @Column(nullable=false,length=255) private String subject;
    @Column(nullable=false,length=12) private String documentNumber;
    @Nationalized @Column(nullable=false,length=100) private String legalName;
    @Column(nullable=false) private LocalDate dateOfBirth;
    @Nationalized @Column(nullable=false,length=30) private String gender;
    @Nationalized @Column(nullable=false,length=300) private String address;
    @Column(nullable=false,length=40) private String source;
    @Column(nullable=false,length=20) private String verificationStatus;
    @Column(nullable=false) private Instant verifiedAt;
    @Version private long version;
}
