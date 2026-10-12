package com.ancu.proptech.repository.apartment;

import com.ancu.proptech.model.apartment.Apartment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ApartmentRepository extends JpaRepository<Apartment, UUID>, JpaSpecificationExecutor<Apartment> {
    @Query("select distinct new com.ancu.proptech.dto.apartment.AddressOption(p.city,p.district,p.ward) from Apartment a join a.property p join p.owner o where a.publicationStatus=:publication and p.approvalStatus=:approval and o.status=:status and o.contactVerified=true and o.role=:role order by p.city,p.district,p.ward")
    List<com.ancu.proptech.dto.apartment.AddressOption> addressOptions(@Param("publication") Apartment.PublicationStatus publication,
        @Param("approval") com.ancu.proptech.model.property.Property.ApprovalStatus approval,
        @Param("status") com.ancu.proptech.model.auth.AuthAccount.Status status,@Param("role") com.ancu.proptech.model.auth.AuthAccount.Role role);
    @EntityGraph(attributePaths = {"property", "property.owner", "amenities"})
    List<Apartment> findByPropertyOwnerIdOrderByCreatedAtAscIdAsc(UUID ownerId);
    boolean existsByPropertyIdAndRoomNumber(UUID propertyId, String roomNumber);
    Optional<Apartment> findByPropertyIdAndRoomNumber(UUID propertyId,String roomNumber);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Apartment a join fetch a.property p join fetch p.owner where a.id = :id")
    Optional<Apartment> findForRequest(@Param("id") UUID id);
}
