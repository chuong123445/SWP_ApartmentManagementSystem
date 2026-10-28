package com.ancu.proptech.model.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;


@Entity @Table(name = "auth_refresh_tokens")
@Getter @Setter @NoArgsConstructor
public class RefreshCredential {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private AuthSession session;
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(columnDefinition = "datetime2(6)")
    private Instant usedAt;
}
