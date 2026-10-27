package com.ancu.proptech.model.auth;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="auth_owner_upgrades") @Getter @Setter @NoArgsConstructor
public class OwnerUpgrade {
    @Id private UUID accountId;
    @Column(nullable=false) private Instant consentedAt;
    @Column(nullable=false) private Instant checkedAt;
    @Column(nullable=false) private int eligibleAssetCount;
    @Column(nullable=false,length=40) private String consentVersion;
    @Column(nullable=false,length=40) private String source;
}
