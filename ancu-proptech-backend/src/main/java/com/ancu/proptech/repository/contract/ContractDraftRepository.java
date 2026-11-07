package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ContractDraftRepository extends JpaRepository<ContractDraft,Long> {
    @org.springframework.data.jpa.repository.Query("select new com.ancu.proptech.dto.contract.TenancyTerms(d.contract.id,d.deposit,d.ownerSignedAt,d.customerSignedAt) from ContractDraft d where d.contract.id in :contractIds")
    List<com.ancu.proptech.dto.contract.TenancyTerms> findTenancyTerms(@org.springframework.data.repository.query.Param("contractIds") Collection<Long> contractIds);
    @org.springframework.data.jpa.repository.Query("select d.contract.id from ContractDraft d where d.contract.renewalOfContractId is not null and d.contract.status=com.ancu.proptech.model.contract.RentalContract.Status.DRAFT and d.ownerSignedAt is not null and d.customerSignedAt is not null and d.contract.startDate<=:today")
    java.util.List<Long> dueSignedRenewals(@org.springframework.data.repository.query.Param("today") java.time.LocalDate today);
    @org.springframework.data.jpa.repository.Query("select d.rentalRequest.id from ContractDraft d where d.contract.id=:id")
    Optional<Long> findRequestId(@org.springframework.data.repository.query.Param("id") Long id);
    Optional<ContractDraft> findByRentalRequestId(Long requestId);
    Optional<ContractDraft> findByContractId(Long contractId);
    List<ContractDraft> findByContractApartmentPropertyOwnerIdOrderByCreatedAtDescIdDesc(Long ownerId);
    List<ContractDraft> findByContractCustomerIdOrderByCreatedAtDescIdDesc(Long customerId);
}
