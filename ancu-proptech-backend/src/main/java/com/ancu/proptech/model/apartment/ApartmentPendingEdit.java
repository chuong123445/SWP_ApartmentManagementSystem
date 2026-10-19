package com.ancu.proptech.model.apartment;

import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Stores sensitive-field changes for an apartment that require admin re-approval
 * before being applied to the live {@link Apartment} record.
 * One row per apartment at most; overwritten on subsequent sensitive updates.
 */
@Entity @Table(name = "apartment_pending_edits") @Getter @Setter @NoArgsConstructor
public class ApartmentPendingEdit {

    /** Shares the same PK as the parent Apartment (one-to-one). */
    @Id private UUID apartmentId;

    @OneToOne(fetch = FetchType.LAZY) @MapsId @JoinColumn(name = "apartment_id")
    private Apartment apartment;

    @Column(precision = 15, scale = 2) private BigDecimal advertisedMonthlyRent;
    @Column(precision = 15, scale = 2) private BigDecimal deposit;
    private Integer electricityIndex;
    private Integer waterIndex;
    @Column(precision = 12, scale = 2) private BigDecimal areaM2;

    @Column(nullable = false, columnDefinition = "datetime2(6)") private Instant requestedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by_owner_id", nullable = false)
    private AuthAccount requestedByOwner;
}
