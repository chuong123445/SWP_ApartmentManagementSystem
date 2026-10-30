package com.ancu.proptech.model.finance;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.math.BigDecimal;
import java.time.*;

@Entity @Table(name="cash_entries",uniqueConstraints=@UniqueConstraint(columnNames={"property_id","request_key"}))
@Getter @Setter @NoArgsConstructor
public class CashEntry {
    public enum Direction { INCOME, EXPENSE }
    public enum Status { DRAFT, POSTED, CANCELLED }
    public enum Method { CASH, BANK_TRANSFER }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="property_id") private Property property;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="created_by") private AuthAccount createdBy;
    @Column(nullable=false,length=36) private String requestKey;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private Direction direction;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private Status status;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Method paymentMethod;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal amount;
    @Column(nullable=false) private LocalDate transactionDate;
    @Nationalized @Column(nullable=false,length=100) private String category;
    @Nationalized @Column(nullable=false,length=200) private String counterparty;
    @Nationalized @Column(nullable=false,length=2000) private String description;
    @Nationalized @Column(length=200) private String reference;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(columnDefinition="datetime2(6)") private Instant postedAt;
    @Column(columnDefinition="datetime2(6)") private Instant cancelledAt;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="posted_by") private AuthAccount postedBy;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="cancelled_by") private AuthAccount cancelledBy;
    @Nationalized @Column(length=1000) private String cancellationReason;
    @Version private long version;
}
