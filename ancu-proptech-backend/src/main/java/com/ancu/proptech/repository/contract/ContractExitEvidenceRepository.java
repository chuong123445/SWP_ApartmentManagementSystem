package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractExitEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ContractExitEvidenceRepository extends JpaRepository<ContractExitEvidence,Long> {
 long countByContractId(Long id);
 List<ContractExitEvidence> findByContractIdOrderByIdAsc(Long id);
}
