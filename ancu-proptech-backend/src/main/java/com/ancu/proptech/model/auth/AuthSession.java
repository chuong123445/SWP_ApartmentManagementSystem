package com.ancu.proptech.model.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;


@Entity @Table(name = "auth_sessions")
@Getter @Setter @NoArgsConstructor
public class AuthSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private AuthAccount account;
    @Column(nullable = false, columnDefinition = "datetime2(6)")
    private Instant expiresAt;
    @Column(columnDefinition = "datetime2(6)")
    private Instant revokedAt;
}
