package com.ancu.proptech.model.payment;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name="invoice_payments") @Getter @Setter @NoArgsConstructor
public class InvoicePayment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private Long invoiceId;
 @Column(nullable=false) private Long ownerId;
 @Column(nullable=false,unique=true,length=28) private String paymentCode;
 @Column(nullable=false,length=50) private String bank;
 @Column(nullable=false,length=30) private String accountNumber;
 @Column(length=34) private String virtualAccount;
 @org.hibernate.annotations.Nationalized @Column(nullable=false,length=100) private String accountHolderName;
 @Column(nullable=false,precision=31,scale=4) private BigDecimal amount;
 @Column(columnDefinition="datetime2(6)") private Instant paidAt;
}
