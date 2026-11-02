package com.ancu.proptech.model.property;

import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;


@Entity @Table(name = "rental_properties") @Getter @Setter @NoArgsConstructor
public class Property {
    public enum ApprovalStatus { DRAFT, PENDING_APPROVAL, NEEDS_INFORMATION, APPROVED, REJECTED }
    public enum RentalMode { SINGLE_UNIT, MULTI_UNIT }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "owner_id", nullable = false)
    private AuthAccount owner;
    @Nationalized @Column(nullable = false, length = 150) private String name;
    @Nationalized @Column(nullable = false, length = 300) private String address;
    @Nationalized @Column(nullable = false, length = 80) private String city;
    @Nationalized @Column(nullable = false, length = 80) private String district;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private ApprovalStatus approvalStatus;
    @Enumerated(EnumType.STRING) @Column(length = 24)
    private RentalMode rentalMode;
    private Long privatePaymentQrId;
    @Version private long version;
    @Nationalized @Column(length = 80) private String ward;
    @Column(nullable=false) private boolean onboardingApplication;
    @Enumerated(EnumType.STRING) @Column(length=24) private PropertyDossier.RightType rightType;
    private java.time.LocalDate rightsValidFrom;
    private java.time.LocalDate rightsValidUntil;
    private Long approvedRightsDossierId;
}
