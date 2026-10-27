package com.ancu.proptech.repository.apartment;

import com.ancu.proptech.model.apartment.Apartment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ApartmentRepository extends JpaRepository<Apartment, UUID>, JpaSpecificationExecutor<Apartment> {
    @Query("select distinct new com.ancu.proptech.dto.apartment.AddressOption(p.city,p.district,p.ward) from Apartment a join a.property p join p.owner o where a.publicationStatus=:publication and a.availability=:availability and p.approvalStatus=:approval and o.status=:status and (o.contactVerified=true or exists(select i.accountId from ExternalIdentity i where i.accountId=o.id and i.verificationStatus='VERIFIED')) and o.role=:role and (p.rightType is null or p.rightType=com.ancu.proptech.model.property.PropertyDossier.RightType.OWNERSHIP or (p.rightsValidFrom<=:today and p.rightsValidUntil>=:today)) order by p.city,p.district,p.ward")
    List<com.ancu.proptech.dto.apartment.AddressOption> addressOptions(@Param("publication") Apartment.PublicationStatus publication, @Param("availability") Apartment.Availability availability,
        @Param("approval") com.ancu.proptech.model.property.Property.ApprovalStatus approval,
        @Param("status") com.ancu.proptech.model.auth.AuthAccount.Status status,@Param("role") com.ancu.proptech.model.auth.AuthAccount.Role role,@Param("today") java.time.LocalDate today);
    @EntityGraph(attributePaths = {"property", "property.owner", "amenities"})
    List<Apartment> findByPropertyOwnerIdOrderByCreatedAtAscIdAsc(UUID ownerId);
    boolean existsByPropertyIdAndRoomNumber(UUID propertyId, String roomNumber);
    long countByPropertyId(UUID propertyId);
    @Query("select a.property.id from Apartment a where a.id=:id")
    Optional<UUID> findPropertyId(@Param("id") UUID id);
    Optional<Apartment> findByPropertyIdAndRoomNumber(UUID propertyId,String roomNumber);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Apartment a join fetch a.property p join fetch p.owner where a.id = :id")
    Optional<Apartment> findForRequest(@Param("id") UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Apartment a where a.id=:id and a.property.owner.id=:ownerId")
    Optional<Apartment> findForOwnerUpdate(@Param("id") UUID id,@Param("ownerId") UUID ownerId);
}
