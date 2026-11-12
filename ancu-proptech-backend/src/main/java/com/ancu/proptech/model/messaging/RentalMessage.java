package com.ancu.proptech.model.messaging;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;

@Entity
@Table(name = "rental_messages")
@Getter @Setter
public class RentalMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private RentalConversation conversation;
    @Column(nullable = false)
    private Long senderId;
    @Column(nullable = false, length = 36)
    private String requestKey;
    @Nationalized
    @Column(nullable = false, length = 2000)
    private String body;
    @Column(nullable = false, columnDefinition = "datetime2(6)")
    private Instant sentAt;
}
