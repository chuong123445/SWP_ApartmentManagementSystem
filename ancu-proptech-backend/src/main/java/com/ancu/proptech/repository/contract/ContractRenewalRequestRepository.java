package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractRenewalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ContractRenewalRequestRepository extends JpaRepository<ContractRenewalRequest,Long> {
    Optional<ContractRenewalRequest> findByContractId(Long contractId);
}
