package com.ancu.proptech.repository.escrow;

import com.ancu.proptech.model.escrow.EscrowDeposit;
import com.ancu.proptech.model.escrow.EscrowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EscrowRepository extends JpaRepository<EscrowDeposit, String> {
    List<EscrowDeposit> findByStatus(EscrowStatus status);
}