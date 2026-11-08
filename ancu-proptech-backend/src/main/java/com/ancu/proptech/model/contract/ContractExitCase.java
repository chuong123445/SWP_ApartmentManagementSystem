package com.ancu.proptech.model.contract;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="contract_exit_cases") @Getter @Setter @NoArgsConstructor
public class ContractExitCase {
 @Id private Long contractId;
 @Column(nullable=false,length=20) private String terminationState="NONE";
 @Column(nullable=false,length=20) private String handoverState="NONE";
 @org.hibernate.annotations.Nationalized @Column(columnDefinition="nvarchar(max)") private String terminationJson;
 @org.hibernate.annotations.Nationalized @Column(columnDefinition="nvarchar(max)") private String handoverJson;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant updatedAt;
 @Version private long version;
}
