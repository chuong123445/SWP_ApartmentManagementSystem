package com.ancu.proptech.model.contract;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name="rental_contracts") @Getter @Setter @NoArgsConstructor
public class RentalContract {
    public enum Status { DRAFT, ACTIVE, ENDED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="apartment_id",nullable=false) private Apartment apartment;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="customer_id",nullable=false) private AuthAccount customer;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Status status;
    @Column(nullable=false) private LocalDate startDate;
    @Column(nullable=false) private LocalDate endDate;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal monthlyRent;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal electricityUnitPrice;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal waterUnitPrice;
    @Column(precision=15,scale=2) private BigDecimal electricityBaseline;
    @Column(precision=15,scale=2) private BigDecimal waterBaseline;
    private LocalDate baselineDate;
    @Column(nullable=false) private long billingVersion;
    @Column(nullable=false) private boolean localFixture;
    @Version private long version;
}
