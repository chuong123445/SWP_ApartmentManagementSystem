package com.ancu.proptech.repository.payment;

import com.ancu.proptech.model.payment.OwnerWithdrawal;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OwnerWithdrawalRepository extends JpaRepository<OwnerWithdrawal, Long> {
    Optional<OwnerWithdrawal> findByOwnerIdAndRequestKey(Long ownerId, String requestKey);
    @org.springframework.data.jpa.repository.Query("select w.ownerId from OwnerWithdrawal w where w.id = :id")
    Optional<Long> findOwnerId(@org.springframework.data.repository.query.Param("id") Long id);
    boolean existsByTransferReference(String reference);
    Page<OwnerWithdrawal> findByOwnerId(Long ownerId, Pageable page);
    Page<OwnerWithdrawal> findByStatus(OwnerWithdrawal.Status status, Pageable page);
}
