package com.ancu.proptech.model.payment;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "owner_withdrawals", uniqueConstraints = @UniqueConstraint(
        name = "ux_owner_withdrawal_request", columnNames = {"owner_id", "request_key"}))
@Getter @Setter
public class OwnerWithdrawal {
    public enum Status { PENDING, PROCESSING, PAID, REJECTED, CANCELLED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long ownerId;
    @Column(nullable = false, length = 36)
    private String requestKey;
    @Column(nullable = false, precision = 31, scale = 0)
    private BigDecimal amount;
    @Column(nullable = false, length = 50)
    private String bank;
    @Column(nullable = false, length = 34)
    private String accountNumber;
    @Nationalized @Column(nullable = false, length = 100)
    private String accountHolder;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status;
    @Column(length = 100)
    private String transferReference;
    @Nationalized @Column(length = 300)
    private String note;
    private Long processingAdminId;
    private Long handledById;
    @Column(nullable = false, columnDefinition = "datetime2(6)")
    private Instant createdAt;
    @Column(nullable = false, columnDefinition = "datetime2(6)")
    private Instant updatedAt;
    @Version
    private long version;
}
