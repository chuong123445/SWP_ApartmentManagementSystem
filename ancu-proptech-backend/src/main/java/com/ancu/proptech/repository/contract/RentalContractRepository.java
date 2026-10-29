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
    @EntityGraph(attributePaths={"apartment","customer"})
    List<RentalContract> findByApartmentPropertyOwnerIdAndStatusOrderByStartDateDescIdAsc(Long ownerId,RentalContract.Status status);
    Optional<RentalContract> findByApartmentIdAndCustomerId(Long apartmentId,Long customerId);
    List<RentalContract> findByApartmentId(Long apartmentId);
    boolean existsByCustomerIdAndLocalFixtureTrue(Long customerId);
    long countByLocalFixtureTrue();
}
