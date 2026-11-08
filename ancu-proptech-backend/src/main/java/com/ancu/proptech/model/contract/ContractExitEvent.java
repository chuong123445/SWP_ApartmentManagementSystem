package com.ancu.proptech.model.contract;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="contract_exit_events") @Getter @Setter @NoArgsConstructor
public class ContractExitEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,updatable=false) private Long contractId;
 @Column(nullable=false,updatable=false) private Long actorId;
 @Column(nullable=false,length=32,updatable=false) private String action;
 @org.hibernate.annotations.Nationalized @Column(nullable=false,length=100,updatable=false) private String actorName;
 @org.hibernate.annotations.Nationalized @Column(nullable=false,length=3000,updatable=false) private String reason;
 @org.hibernate.annotations.Nationalized @Column(nullable=false,columnDefinition="nvarchar(max)",updatable=false) private String beforeJson;
 @org.hibernate.annotations.Nationalized @Column(nullable=false,columnDefinition="nvarchar(max)",updatable=false) private String afterJson;
 @Column(nullable=false,columnDefinition="datetime2(6)",updatable=false) private Instant createdAt;
}
