package com.ancu.proptech.repository.rental;

import com.ancu.proptech.model.rental.RentalRequest;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;


public interface RentalRequestRepository extends JpaRepository<RentalRequest, Long> {
    boolean existsByApartmentIdAndStatus(Long apartmentId, RentalRequest.Status status);
    java.util.List<RentalRequest> findByCustomerIdAndApartmentIdAndStatusInOrderByCreatedAtDescIdDesc(
            Long customerId, Long apartmentId, java.util.Collection<RentalRequest.Status> statuses);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RentalRequest r where r.id = :id and r.customer.id = :customerId")
    java.util.Optional<RentalRequest> findOwnForUpdate(@Param("id") Long id, @Param("customerId") Long customerId);
    @EntityGraph(attributePaths = {"apartment", "apartment.property", "customer"})
    Page<RentalRequest> findByCustomerId(Long customerId, Pageable page);
    @EntityGraph(attributePaths = {"apartment", "apartment.property", "customer"})
    @Query(value = "select r from RentalRequest r where r.apartment.property.owner.id = :ownerId "
            + "and (:apartmentId is null or r.apartment.id = :apartmentId) and (:status is null or r.status = :status) "
            + "and (:propertyId is null or r.apartment.property.id = :propertyId) "
            + "order by case when r.status = com.ancu.proptech.model.rental.RentalRequest.Status.PENDING then 0 else 1 end asc, "
            + "r.createdAt asc, r.id asc",
            countQuery = "select count(r) from RentalRequest r where r.apartment.property.owner.id = :ownerId "
            + "and (:apartmentId is null or r.apartment.id = :apartmentId) and (:status is null or r.status = :status) "
            + "and (:propertyId is null or r.apartment.property.id = :propertyId)")
    Page<RentalRequest> findOwnerInbox(@Param("ownerId") Long ownerId, @Param("apartmentId") Long apartmentId,
                                     @Param("status") RentalRequest.Status status, @Param("propertyId") Long propertyId, Pageable page);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RentalRequest r where r.id = :id and r.apartment.property.owner.id = :ownerId")
    java.util.Optional<RentalRequest> findForOwnerUpdate(@Param("id") Long id, @Param("ownerId") Long ownerId);
}
