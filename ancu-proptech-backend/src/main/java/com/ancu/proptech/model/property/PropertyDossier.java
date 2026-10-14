package com.ancu.proptech.model.property;
import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
@Entity @Table(name="property_dossiers") @Getter @Setter @NoArgsConstructor
public class PropertyDossier {
    public enum Status { PENDING_APPROVAL, NEEDS_INFORMATION, APPROVED, REJECTED }
    public enum RightType { OWNERSHIP, AUTHORIZATION }
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="property_id",nullable=false) private Property property;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private RightType rightType;
    @Nationalized @Column(nullable=false,length=100) private String applicantName;
    @Nationalized @Column(nullable=false,length=100) private String bank;
    @Column(nullable=false,length=40) private String accountNumber;
    @Nationalized @Column(nullable=false,length=100) private String accountHolderName;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Status status;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant submittedAt;
    @Column(columnDefinition="datetime2(6)") private Instant reviewedAt;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="reviewer_id") private AuthAccount reviewer;
    @Nationalized @Column(length=2000) private String reviewReason;
    @Nationalized @Column(length=100) private String certificateNumber;
    private LocalDate certificateIssueDate;
    @Nationalized @Column(length=200) private String certificateIssuePlace;
    @Nationalized @Column(length=1000) private String exploitationRightDescription;
    @Column(nullable=false) private boolean localFixture;
    @ManyToMany @JoinTable(name="property_dossier_files",joinColumns=@JoinColumn(name="dossier_id"),inverseJoinColumns=@JoinColumn(name="file_id"))
    private List<PropertyEvidenceFile> files=new ArrayList<>();
    @Version private long version;
}
