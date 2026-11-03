package com.ancu.proptech.model.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Nationalized;

/** Shared immutable role catalog; account persistence never creates or edits roles. */
@Entity @Table(name="auth_roles",uniqueConstraints=@UniqueConstraint(name="uq_auth_roles_code",columnNames="code")) @Immutable @Getter
@NoArgsConstructor(access=lombok.AccessLevel.PROTECTED)
public class AuthRole {
    @Id private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20)
    private AuthAccount.Role code;
    @Nationalized @Column(nullable=false,length=100) private String name;

    // Stable catalog IDs seeded/validated by V52, not enum ordinals.
    public static AuthRole reference(AuthAccount.Role code){
        var result=new AuthRole();result.code=java.util.Objects.requireNonNull(code);
        result.id=switch(code){case ADMIN->1L;case OWNER->2L;case CUSTOMER->3L;};
        return result;
    }
    @Override public boolean equals(Object other){return other instanceof AuthRole role && getId()!=null && getId().equals(role.getId());}
    @Override public int hashCode(){return java.util.Objects.hashCode(getId());}
}
