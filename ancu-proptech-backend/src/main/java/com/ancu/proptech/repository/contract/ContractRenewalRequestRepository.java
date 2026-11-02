package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractRenewalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ContractRenewalRequestRepository extends JpaRepository<ContractRenewalRequest,Long> {
    Optional<ContractRenewalRequest> findByContractId(Long contractId);
    @org.springframework.data.jpa.repository.Query(value="select r from ContractRenewalRequest r, RentalContract c where c.id=r.contractId and c.apartment.property.owner.id=:ownerId and (:propertyId is null or c.apartment.property.id=:propertyId) and (:status is null or r.status=:status) order by case when r.status=com.ancu.proptech.model.contract.ContractRenewalRequest.Status.PENDING then 0 else 1 end,r.createdAt,r.id",
        countQuery="select count(r) from ContractRenewalRequest r, RentalContract c where c.id=r.contractId and c.apartment.property.owner.id=:ownerId and (:propertyId is null or c.apartment.property.id=:propertyId) and (:status is null or r.status=:status)")
    org.springframework.data.domain.Page<ContractRenewalRequest> inbox(@org.springframework.data.repository.query.Param("ownerId") Long ownerId,@org.springframework.data.repository.query.Param("propertyId") Long propertyId,@org.springframework.data.repository.query.Param("status") ContractRenewalRequest.Status status,org.springframework.data.domain.Pageable page);
}
