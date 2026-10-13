package com.ancu.proptech.repository.rental;

import com.ancu.proptech.model.rental.RentalRequest;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface RentalRequestRepository extends JpaRepository<RentalRequest, UUID> {
    java.util.List<RentalRequest> findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(
            UUID customerId, UUID apartmentId, java.util.Collection<RentalRequest.Status> statuses);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RentalRequest r where r.id = :id and r.customer.id = :customerId")
    java.util.Optional<RentalRequest> findOwnForUpdate(@Param("id") UUID id, @Param("customerId") UUID customerId);
    @EntityGraph(attributePaths = {"apartment", "apartment.property", "customer"})
    Page<RentalRequest> findByCustomerId(UUID customerId, Pageable page);
    @EntityGraph(attributePaths = {"apartment", "apartment.property", "customer"})
    @Query(value = "select r from RentalRequest r where r.apartment.property.owner.id = :ownerId "
            + "and (:apartmentId is null or r.apartment.id = :apartmentId) and (:status is null or r.status = :status) "
            + "order by case when r.status = com.ancu.proptech.model.rental.RentalRequest.Status.PENDING then 0 else 1 end asc, "
            + "r.createdAt asc, r.id asc",
            countQuery = "select count(r) from RentalRequest r where r.apartment.property.owner.id = :ownerId "
            + "and (:apartmentId is null or r.apartment.id = :apartmentId) and (:status is null or r.status = :status)")
    Page<RentalRequest> findOwnerInbox(@Param("ownerId") UUID ownerId, @Param("apartmentId") UUID apartmentId,
                                     @Param("status") RentalRequest.Status status, Pageable page);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RentalRequest r where r.id = :id and r.apartment.property.owner.id = :ownerId")
    java.util.Optional<RentalRequest> findForOwnerUpdate(@Param("id") UUID id, @Param("ownerId") UUID ownerId);
}
