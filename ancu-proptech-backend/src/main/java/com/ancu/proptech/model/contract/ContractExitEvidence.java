package com.ancu.proptech.model.contract;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="contract_exit_evidence") @Getter @Setter @NoArgsConstructor
public class ContractExitEvidence {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,updatable=false) private Long contractId;
 @Column(nullable=false,updatable=false) private Long uploaderId;
 @org.hibernate.annotations.Nationalized @Column(nullable=false,length=160,updatable=false) private String filename;
 @Column(nullable=false,length=24,updatable=false) private String contentType;
 @Lob @Column(nullable=false,columnDefinition="varbinary(max)",updatable=false) private byte[] content;
 @Column(nullable=false,columnDefinition="datetime2(6)",updatable=false) private Instant createdAt;
}
