package com.ancu.proptech.model.payment;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name="sepay_events") @Getter @Setter @NoArgsConstructor
public class SepayEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private Long transactionId;
 @Column(nullable=false) private Long ownerId;
 private Long invoiceId;
 @Column(nullable=false,length=32) private String result;
 @Column(nullable=false,precision=31,scale=4) private BigDecimal amount;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant receivedAt;
}
