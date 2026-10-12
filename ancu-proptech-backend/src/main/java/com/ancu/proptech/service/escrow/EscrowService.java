package com.ancu.proptech.service.escrow;

import com.ancu.proptech.model.escrow.EscrowDeposit;
import com.ancu.proptech.model.escrow.EscrowStatus;
import com.ancu.proptech.repository.escrow.EscrowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EscrowService {

    private final EscrowRepository escrowRepository;

    @Transactional(readOnly = true)
    public List<EscrowDeposit> getEscrows() {
        return escrowRepository.findAll();
    }

    @Transactional
    public EscrowDeposit createEscrow(EscrowDeposit depositRequest) {
        depositRequest.setStatus(EscrowStatus.HELD);
        depositRequest.setBankHoldReference("MB-ESCROW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        depositRequest.setCreatedAt(LocalDateTime.now());
        return escrowRepository.save(depositRequest);
    }

    @Transactional
    public EscrowDeposit releaseEscrow(String escrowId) {
        EscrowDeposit deposit = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ ký quỹ: " + escrowId));

        deposit.setStatus(EscrowStatus.RELEASED_TO_LANDLORD);
        deposit.setReleasedAt(LocalDateTime.now());
        return escrowRepository.save(deposit);
    }
}
