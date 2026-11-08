package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractExitEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ContractExitEventRepository extends JpaRepository<ContractExitEvent,Long> {
 List<ContractExitEvent> findByContractIdOrderByIdAsc(Long id);
}
