package com.ancu.proptech.model.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import java.time.LocalDate;

@Entity
@Table(name = "auth_accounts")
@Getter @Setter @NoArgsConstructor
public class AuthAccount {
    public enum Role { ADMIN, OWNER, CUSTOMER }
    public enum Status { PENDING_VERIFICATION, ACTIVE, LOCKED, INACTIVE }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 254)
    private String email;
    @Column(length = 255)
    private String googleSubject;
    @Column(length = 100)
    private String passwordHash;
    @Column(nullable=false) private boolean localPasswordEnabled=true;
    @Nationalized @Column(nullable = false, length = 100)
    private String fullName;
    @Column(length=20) private String phone;
    @Nationalized @Column(length=300) private String address;
    @Nationalized @Column(length=1000) private String bio;
    private LocalDate dateOfBirth;
    @Column(nullable=false) private boolean emailVerified;
    @Column(nullable=false) private boolean identityVerified;
    @Column(nullable=false) private boolean phoneVerified;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Role role;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private Status status;
    @Column(nullable = false)
    private boolean contactVerified;
    @Version
    private long version;
}
