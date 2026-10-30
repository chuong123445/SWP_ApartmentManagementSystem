package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.RentalContract;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface RentalContractRepository extends JpaRepository<RentalContract,Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RentalContract c where c.id=:id")
    Optional<RentalContract> lockById(@Param("id") Long id);
    @EntityGraph(attributePaths={"apartment","apartment.property","apartment.property.owner","customer"})
    List<RentalContract> findByApartmentPropertyOwnerIdOrderByStartDateDescIdAsc(Long ownerId);
    @EntityGraph(attributePaths={"apartment","apartment.property","customer"})
    List<RentalContract> findByCustomerIdOrderByStartDateDescIdAsc(Long customerId);
    Optional<RentalContract> findFirstByApartmentIdAndCustomerIdOrderByStartDateDescIdDesc(Long apartmentId,Long customerId);
    List<RentalContract> findByRenewalOfContractIdAndStatusNot(Long id,RentalContract.Status status);
    List<RentalContract> findByApartmentId(Long apartmentId);
    boolean existsByCustomerIdAndLocalFixtureTrue(Long customerId);
    long countByLocalFixtureTrue();
}
