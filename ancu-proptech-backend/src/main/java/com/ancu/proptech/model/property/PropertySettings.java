package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name="property_settings") @Getter @Setter @NoArgsConstructor
public class PropertySettings {
 public enum WaterBillingMode { METERED, PER_PERSON }
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private WaterBillingMode waterBillingMode=WaterBillingMode.METERED;
 @Id private Long id;
 @MapsId @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="property_id") private Property property;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityUnitPrice;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal waterUnitPrice;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal internetFee;
 @Column(nullable=false,precision=15,scale=2) private BigDecimal garbageFee;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant updatedAt;
 @Column(nullable=false) private Long updatedBy;
 @Version private long version;
}
