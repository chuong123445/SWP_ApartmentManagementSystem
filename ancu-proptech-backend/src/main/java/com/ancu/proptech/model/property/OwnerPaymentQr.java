package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.Instant;
@Entity @Table(name="owner_payment_qrs") @Getter @Setter @NoArgsConstructor
public class OwnerPaymentQr {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private Long ownerId;
 @Column(nullable=false,length=6) private String bankBin;
 @Column(nullable=false,length=100) private String bank;
 @Column(nullable=false,length=34) private String accountNumber;
 @Nationalized @Column(length=200) private String accountHolderName;
 @Column(nullable=false,length=24) private String contentType;
 @Lob @Column(nullable=false,columnDefinition="varbinary(max)") private byte[] content;
 @Column(nullable=false,length=32) private String aiStatus;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
 @Column(columnDefinition="datetime2(6)") private Instant confirmedAt;
 @Version private long version;
}
