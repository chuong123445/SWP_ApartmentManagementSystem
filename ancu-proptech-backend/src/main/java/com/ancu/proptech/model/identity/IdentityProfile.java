package com.ancu.proptech.model.identity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.*;


/** Private, self-declared identity data. Collection never establishes legal identity. */
@Entity @Table(name="account_identity_profiles") @Getter @Setter @NoArgsConstructor
public class IdentityProfile {
    public enum VerificationStatus { NOT_VERIFIED }
    @Id private Long accountId;
    @Nationalized @Column(nullable=false,length=100) private String legalName;
    @Column(nullable=false,length=12) private String documentNumber;
    @Column(nullable=false) private LocalDate dateOfBirth;
    @Column(nullable=false) private LocalDate issueDate;
    @Nationalized @Column(nullable=false,length=200) private String issuePlace;
    @Nationalized @Column(nullable=false,length=500) private String permanentAddress;
    @Nationalized @Column(nullable=false,length=500) private String currentAddress;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private VerificationStatus verificationStatus=VerificationStatus.NOT_VERIFIED;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant updatedAt;
    @Column(nullable=false) private boolean localFixture;
    @Version private long version;
}
