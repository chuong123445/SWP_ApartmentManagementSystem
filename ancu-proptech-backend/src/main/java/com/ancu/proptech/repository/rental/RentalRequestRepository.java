package com.ancu.proptech.repository.rental;

import com.ancu.proptech.model.rental.RentalRequest;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface RentalRequestRepository extends JpaRepository<RentalRequest, UUID> {
    @EntityGraph(attributePaths = {"apartment", "apartment.property", "customer"})
    Page<RentalRequest> findByCustomerId(UUID customerId, Pageable page);
    @EntityGraph(attributePaths = {"apartment", "apartment.property", "customer"})
    @Query("select r from RentalRequest r where r.apartment.property.owner.id = :ownerId "
            + "and (:apartmentId is null or r.apartment.id = :apartmentId) and (:status is null or r.status = :status)")
    Page<RentalRequest> findOwnerInbox(@Param("ownerId") UUID ownerId, @Param("apartmentId") UUID apartmentId,
                                     @Param("status") RentalRequest.Status status, Pageable page);
}
