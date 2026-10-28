package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractHandover;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ContractHandoverRepository extends JpaRepository<ContractHandover,Long> {
    Optional<ContractHandover> findFirstByContractIdOrderByIdDesc(Long id);
    boolean existsByContractIdAndStatus(Long id,ContractHandover.Status status);
}
