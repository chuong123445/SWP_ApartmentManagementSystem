package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ContractDraftRepository extends JpaRepository<ContractDraft,Long> {
    @org.springframework.data.jpa.repository.Query("select d.rentalRequest.id from ContractDraft d where d.contract.id=:id")
    Optional<Long> findRequestId(@org.springframework.data.repository.query.Param("id") Long id);
    Optional<ContractDraft> findByRentalRequestId(Long requestId);
    Optional<ContractDraft> findByContractId(Long contractId);
    List<ContractDraft> findByContractApartmentPropertyOwnerIdOrderByCreatedAtDescIdDesc(Long ownerId);
    List<ContractDraft> findByContractCustomerIdOrderByCreatedAtDescIdDesc(Long customerId);
}
