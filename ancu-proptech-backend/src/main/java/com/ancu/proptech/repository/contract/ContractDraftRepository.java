package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ContractDraftRepository extends JpaRepository<ContractDraft,UUID> {
    @org.springframework.data.jpa.repository.Query("select d.rentalRequest.id from ContractDraft d where d.contract.id=:id")
    Optional<UUID> findRequestId(@org.springframework.data.repository.query.Param("id") UUID id);
    Optional<ContractDraft> findByRentalRequestId(UUID requestId);
    Optional<ContractDraft> findByContractId(UUID contractId);
    List<ContractDraft> findByContractApartmentPropertyOwnerIdOrderByCreatedAtDescIdDesc(UUID ownerId);
    List<ContractDraft> findByContractCustomerIdOrderByCreatedAtDescIdDesc(UUID customerId);
}
