package com.ancu.proptech.model.billing;

import com.ancu.proptech.model.contract.RentalContract;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name="maintenance_charges")
@Getter @Setter @NoArgsConstructor
public class MaintenanceCharge {
    @Id private Long ticketId;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="contract_id",nullable=false)
    private RentalContract contract;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id")
    private RentalInvoice invoice;
    @Column(nullable=false,length=7) private String period;
    @org.hibernate.annotations.Nationalized @Column(nullable=false,length=200) private String title;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal actualCost;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal customerCost;
}
