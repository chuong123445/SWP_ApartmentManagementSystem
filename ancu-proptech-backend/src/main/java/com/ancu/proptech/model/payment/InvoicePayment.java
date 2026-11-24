package com.ancu.proptech.model.payment;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name="invoice_payments") @Getter @Setter @NoArgsConstructor
public class InvoicePayment {
 public enum Method { BANK_TRANSFER, CASH }
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private Long invoiceId;
 @Column(nullable=false) private Long ownerId;
 private Long collectionOwnerId;
 @Column(nullable=false,unique=true,length=28) private String paymentCode;
 @Column(length=50) private String bank;
 @Column(length=30) private String accountNumber;
 @Column(length=34) private String virtualAccount;
 @org.hibernate.annotations.Nationalized @Column(length=100) private String accountHolderName;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Method paymentMethod=Method.BANK_TRANSFER;
 private Long confirmedBy;
 @org.hibernate.annotations.Nationalized @Column(length=1000) private String confirmationNote;
 @Column(nullable=false,precision=31,scale=4) private BigDecimal amount;
 @Column(columnDefinition="datetime2(6)") private Instant paidAt;
}
