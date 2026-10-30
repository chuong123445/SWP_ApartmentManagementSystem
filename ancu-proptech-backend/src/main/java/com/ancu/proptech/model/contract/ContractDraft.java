package com.ancu.proptech.model.contract;

import com.ancu.proptech.model.rental.RentalRequest;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.math.BigDecimal;
import java.time.Instant;


/** Additive authoring data; legacy ACTIVE fixtures do not acquire invented snapshots. */
@Entity @Table(name="contract_drafts") @Getter @Setter @NoArgsConstructor
public class ContractDraft {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="contract_id",nullable=false,unique=true)
    private RentalContract contract;
    @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="rental_request_id",nullable=false,unique=true)
    private RentalRequest rentalRequest;
    @Nationalized @Column(nullable=false,columnDefinition="nvarchar(max)") private String snapshotJson;
    @Nationalized @Column(nullable=false,columnDefinition="nvarchar(max)") private String clausesJson;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal deposit;
    @Column(nullable=false) private int paymentDay;
    @Nationalized @Column(nullable=false,length=300) private String paymentMethod;
    @Nationalized @Column(nullable=false,length=300) private String usagePurpose;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(nullable=false) private long contentVersion;
    @Column(length=20) private String templateType;
    @Lob @Column(columnDefinition="varbinary(max)") private byte[] ownerSignature;
    @Lob @Column(columnDefinition="varbinary(max)") private byte[] customerSignature;
    @Column(columnDefinition="datetime2(6)") private Instant ownerSignedAt;
    @Column(columnDefinition="datetime2(6)") private Instant customerSignedAt;
    @Column(length=64) private String signedContentHash;
}
