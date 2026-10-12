package com.ancu.proptech.model.billing;
import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="invoice_notifications") @Getter @Setter @NoArgsConstructor
public class InvoiceNotification {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="invoice_id",nullable=false,unique=true) private RentalInvoice invoice;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="customer_id",nullable=false) private AuthAccount customer;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
}
