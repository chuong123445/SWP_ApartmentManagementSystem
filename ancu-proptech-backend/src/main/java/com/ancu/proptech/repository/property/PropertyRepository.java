package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PropertyRepository extends JpaRepository<Property, UUID> {
    @org.springframework.data.jpa.repository.Query("select p.id from Property p where p.approvalStatus=com.ancu.proptech.model.property.Property.ApprovalStatus.APPROVED and p.approvedRightsDossierId is not null and p.rightsValidUntil<=:through")
    List<UUID> rightsDue(@org.springframework.data.repository.query.Param("through") java.time.LocalDate through);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Property p where p.id = :id")
    Optional<Property> lockById(@org.springframework.data.repository.query.Param("id") UUID id);
    List<Property> findByOwnerIdOrderByNameAscIdAsc(UUID ownerId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Property p where p.id = :id and p.owner.id = :ownerId")
    Optional<Property> findOwnedForCreation(@org.springframework.data.repository.query.Param("id") UUID id,
                                         @org.springframework.data.repository.query.Param("ownerId") UUID ownerId);
}
