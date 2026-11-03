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
    // Compatibility projection for old data/tools; authorization uses memberships.
    private Role role;
    @ElementCollection(fetch=FetchType.EAGER)
    @CollectionTable(name="auth_account_roles", joinColumns=@JoinColumn(name="account_id",foreignKey=@ForeignKey(name="fk_auth_account_roles_account")))
    @Enumerated(EnumType.STRING) @Column(name="role",nullable=false,length=20)
    @Setter(lombok.AccessLevel.NONE)
    private java.util.Set<Role> roles=java.util.EnumSet.noneOf(Role.class);

    public java.util.Set<Role> getRoles(){return java.util.Collections.unmodifiableSet(roles);}
    public boolean hasRole(Role value){return roles.contains(value);}
    public java.util.List<String> roleNames(){return roles.stream().sorted().map(Enum::name).toList();}

    /** Internal account creation/explicit replacement only; never bind account entities to public input. */
    public void setRole(Role value){
        java.util.Objects.requireNonNull(value);
        roles.clear();roles.add(value);
        if(value==Role.OWNER)roles.add(Role.CUSTOMER);
        role=value;
    }
    /** Authorized property onboarding adds OWNER without losing CUSTOMER. */
    public void grantRole(Role value){
        java.util.Objects.requireNonNull(value);
        if(value==Role.ADMIN||hasRole(Role.ADMIN))throw new IllegalArgumentException("Admin membership is provisioned separately.");
        roles.add(value);
        if(value==Role.OWNER)roles.add(Role.CUSTOMER);
        role=hasRole(Role.OWNER)?Role.OWNER:Role.CUSTOMER;
    }
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private Status status;
    @Column(nullable = false)
    private boolean contactVerified;
    @Version
    private long version;
}
