package com.ancu.proptech.model.payment;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="sepay_connections") @Getter @Setter @NoArgsConstructor
public class SepayConnection {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private Long ownerId;
 @Column(nullable=false,length=50) private String bank;
 @Column(nullable=false,length=30) private String accountNumber;
 @org.hibernate.annotations.Nationalized @Column(nullable=false,length=100) private String accountHolderName;
 @Column(length=34) private String virtualAccount;
 @Column(nullable=false,length=64) private String secretHash;
 @Column(nullable=false) private boolean enabled=true;
 @Column(columnDefinition="datetime2(6)") private Instant lastWebhookAt;
 @Column(nullable=false,length=64) private String bankAccountId;
 @Version private long version;
}
