package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.ContractExitCase;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ContractExitCaseRepository extends JpaRepository<ContractExitCase,Long> {
 java.util.List<ContractExitCase> findByUnilateralState(String state);
 @org.springframework.data.jpa.repository.Query("select e from ContractExitCase e, RentalContract c where e.contractId=c.id and c.status=com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE and (c.customer.id=:actor or c.apartment.property.owner.id=:actor) and (e.terminationState='PENDING' or e.unilateralState='PENDING') order by e.updatedAt desc")
 java.util.List<ContractExitCase> pendingForParty(@org.springframework.data.repository.query.Param("actor") Long actor);
}
