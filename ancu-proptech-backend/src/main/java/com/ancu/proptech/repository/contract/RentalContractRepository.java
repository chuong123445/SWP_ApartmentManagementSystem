package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.RentalContract;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface RentalContractRepository extends JpaRepository<RentalContract,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RentalContract c where c.id=:id")
    Optional<RentalContract> lockById(@Param("id") UUID id);
    @EntityGraph(attributePaths={"apartment","apartment.property","apartment.property.owner","customer"})
    List<RentalContract> findByApartmentPropertyOwnerIdOrderByStartDateDescIdAsc(UUID ownerId);
    @EntityGraph(attributePaths={"apartment","apartment.property","customer"})
    List<RentalContract> findByCustomerIdOrderByStartDateDescIdAsc(UUID customerId);
    Optional<RentalContract> findByApartmentIdAndCustomerId(UUID apartmentId,UUID customerId);
    List<RentalContract> findByApartmentId(UUID apartmentId);
    boolean existsByCustomerIdAndLocalFixtureTrue(UUID customerId);
    long countByLocalFixtureTrue();
}
