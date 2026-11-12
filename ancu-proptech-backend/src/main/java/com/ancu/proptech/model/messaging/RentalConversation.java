package com.ancu.proptech.model.messaging;

import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "rental_conversations")
@Getter @Setter
public class RentalConversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Apartment apartment;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AuthAccount customer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AuthAccount owner;
    @Column(columnDefinition = "datetime2(6)")
    private Instant lastMessageAt;
}
