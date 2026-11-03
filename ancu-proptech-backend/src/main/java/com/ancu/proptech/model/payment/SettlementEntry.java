package com.ancu.proptech.model.payment;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "settlement_entries", uniqueConstraints = @UniqueConstraint(
        name = "ux_settlement_entry_source", columnNames = {"kind", "source_id"}))
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class SettlementEntry {
    public enum Kind { INVOICE, ADDITIONAL_RECEIPT, RESERVE, RELEASE, PAYOUT }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long ownerId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private Kind kind;
    @Column(nullable = false)
    private Long sourceId;
    @Column(nullable = false, precision = 31, scale = 0)
    private BigDecimal amount;
    @Column(nullable = false, columnDefinition = "datetime2(6)")
    private Instant createdAt;

    public SettlementEntry(Long ownerId, Kind kind, Long sourceId, BigDecimal amount) {
        this.ownerId = ownerId;
        this.kind = kind;
        this.sourceId = sourceId;
        this.amount = amount;
        this.createdAt = Instant.now();
    }
}
