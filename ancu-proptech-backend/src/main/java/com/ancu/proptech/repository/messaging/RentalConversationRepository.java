package com.ancu.proptech.repository.messaging;

import com.ancu.proptech.model.messaging.RentalConversation;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RentalConversationRepository extends JpaRepository<RentalConversation, Long> {
    Optional<RentalConversation> findByApartmentIdAndCustomerIdAndOwnerId(Long apartmentId, Long customerId, Long ownerId);

    @EntityGraph(attributePaths = {"apartment", "customer", "owner"})
    @Query("""
        select c from RentalConversation c
        where c.lastMessageAt is not null and (c.customer.id = :customerId or c.owner.id = :ownerId)
        """)
    Page<RentalConversation> inbox(@Param("customerId") Long customerId, @Param("ownerId") Long ownerId, Pageable page);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RentalConversation c where c.id = :id and (c.customer.id = :accountId or c.owner.id = :accountId)")
    Optional<RentalConversation> lock(@Param("id") Long id, @Param("accountId") Long accountId);
}
