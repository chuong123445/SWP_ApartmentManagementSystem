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
    @ManyToMany(fetch=FetchType.EAGER)
    @JoinTable(name="auth_account_roles",
        joinColumns=@JoinColumn(name="account_id",nullable=false),
        inverseJoinColumns=@JoinColumn(name="role_id",nullable=false),
        foreignKey=@ForeignKey(name="fk_auth_account_roles_account"),
        inverseForeignKey=@ForeignKey(name="fk_auth_account_roles_role"))
    @Getter(lombok.AccessLevel.NONE) @Setter(lombok.AccessLevel.NONE)
    private java.util.Set<AuthRole> roleDefinitions=new java.util.HashSet<>();

    public java.util.Set<Role> getRoles(){return roleDefinitions.stream().map(AuthRole::getCode).collect(java.util.stream.Collectors.toUnmodifiableSet());}
    public boolean hasRole(Role value){return roleDefinitions.stream().anyMatch(definition->definition.getCode()==value);}
    public java.util.List<String> roleNames(){return getRoles().stream().sorted().map(Enum::name).toList();}

    /** Internal account creation/explicit replacement only; never bind account entities to public input. */
    public void setRole(Role value){
        java.util.Objects.requireNonNull(value);
        roleDefinitions.clear();roleDefinitions.add(AuthRole.reference(value));
        if(value==Role.OWNER)roleDefinitions.add(AuthRole.reference(Role.CUSTOMER));
        role=value;
    }
    /** Authorized property onboarding adds OWNER without losing CUSTOMER. */
    public void grantRole(Role value){
        java.util.Objects.requireNonNull(value);
        if(value==Role.ADMIN||hasRole(Role.ADMIN))throw new IllegalArgumentException("Admin membership is provisioned separately.");
        roleDefinitions.add(AuthRole.reference(value));
        if(value==Role.OWNER)roleDefinitions.add(AuthRole.reference(Role.CUSTOMER));
        role=hasRole(Role.OWNER)?Role.OWNER:Role.CUSTOMER;
    }
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private Status status;
    @Column(nullable = false)
    private boolean contactVerified;
    @Version
    private long version;
}
