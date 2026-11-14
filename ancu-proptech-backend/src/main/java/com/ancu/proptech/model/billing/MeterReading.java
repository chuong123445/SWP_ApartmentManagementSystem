package com.ancu.proptech.model.billing;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.model.property.PropertySettings.WaterBillingMode;
@Entity @Table(name="billing_meter_readings",uniqueConstraints=@UniqueConstraint(columnNames={"contract_id","period"})) @Getter @Setter @NoArgsConstructor
public class MeterReading {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="contract_id",nullable=false) private RentalContract contract;
 @Column(nullable=false,length=7) private String period;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityEndReading;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal waterEndReading;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityUnitPrice;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal waterUnitPrice;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal internetFee;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal garbageFee;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private WaterBillingMode waterBillingMode;
 @Column(nullable=false) private int occupantCount;
 @Column(nullable=false) private boolean propertyRates;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant savedAt;
 @Column(nullable=false) private Long savedBy;
}
