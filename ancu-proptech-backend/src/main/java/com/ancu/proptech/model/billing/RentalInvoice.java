package com.ancu.proptech.model.billing;
import com.ancu.proptech.model.contract.RentalContract;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
@Entity @Table(name="rental_invoices",uniqueConstraints=@UniqueConstraint(name="ux_invoice_contract_period",columnNames={"contract_id","period"}))
@Getter @Setter @NoArgsConstructor
public class RentalInvoice {
    public enum Status { DRAFT, SENT }
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="contract_id",nullable=false) private RentalContract contract;
    @Column(nullable=false,length=7) private String period;
    @Column(nullable=false) private LocalDate dueDate;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal monthlyRent;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityStartReading;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityEndReading;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityQuantity;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityUnitPrice;
    @Column(nullable=false,precision=30,scale=4) private BigDecimal electricityAmount;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal waterStartReading;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal waterEndReading;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal waterQuantity;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal waterUnitPrice;
    @Column(nullable=false,precision=30,scale=4) private BigDecimal waterAmount;
    @Column(nullable=false,precision=31,scale=4) private BigDecimal totalAmount;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private Status status;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(columnDefinition="datetime2(6)") private Instant sentAt;
    @Version private long version;
}
