package com.ancu.proptech.model.rental;

import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "rental_requests") @Getter @Setter @NoArgsConstructor
public class RentalRequest {
    public enum Status { PENDING, ACCEPTED, REJECTED, CANCELLED }
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "customer_id", nullable = false)
    private AuthAccount customer;
    @Nationalized @Column(nullable = false, length = 2000) private String message;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private Status status;
    @Column(nullable = false, columnDefinition = "datetime2(6)") private Instant createdAt;
    @Version private long version;
}
