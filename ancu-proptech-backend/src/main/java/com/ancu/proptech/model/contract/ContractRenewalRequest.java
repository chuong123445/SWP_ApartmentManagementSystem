package com.ancu.proptech.model.contract;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="contract_renewal_requests") @Getter @Setter @NoArgsConstructor
public class ContractRenewalRequest {
    public enum Status { PENDING, ACCEPTED, REJECTED, FULFILLED, CANCELLED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,unique=true) private Long contractId;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Status status;
    @Column(nullable=false,length=1000,columnDefinition="nvarchar(1000)") private String message;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(length=16) private String decision;
    @Column(length=1000,columnDefinition="nvarchar(1000)") private String decisionReason;
    @Column(columnDefinition="datetime2(6)") private Instant decidedAt;
    @Column(columnDefinition="datetime2(6)") private Instant cancelledAt;
    @Version private long version;
}
