package com.ancu.proptech.model.contract;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;
import org.hibernate.annotations.Nationalized;

@Entity @Table(name="contract_handovers") @Getter @Setter @NoArgsConstructor
public class ContractHandover {
    public enum Status { PENDING, CONFIRMED, CANCELLED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="contract_id",nullable=false) private RentalContract contract;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Status status;
    @Column(nullable=false) private LocalDate returnDate;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityReading;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal waterReading;
    @Column(precision=15,scale=2) private BigDecimal electricityStartReading;
    @Column(precision=15,scale=2) private BigDecimal waterStartReading;
    @Column(nullable=false) private boolean keysReturned;
    @Nationalized @Column(nullable=false,length=3000) private String conditionNotes;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal deductionAmount;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal depositAmount;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal utilityAmount;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal refundAmount;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal extraAmountDue;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant ownerConfirmedAt;
    @Column(columnDefinition="datetime2(6)") private Instant customerConfirmedAt;
    @Version private long version;
}
