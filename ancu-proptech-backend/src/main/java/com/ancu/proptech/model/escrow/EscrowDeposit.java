package com.ancu.proptech.model.escrow;

import com.ancu.proptech.model.escrow.EscrowStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "escrow_deposits")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EscrowDeposit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String contractId;

    @Column(nullable = false)
    private String roomId;

    private String tenantName;
    private String landlordName;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount; // Số tiền bảo chứng

    @Column(length = 50)
    private String bankHoldReference; // Mã phong tỏa giao dịch ngân hàng

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private EscrowStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime releasedAt;
    private String note;
}