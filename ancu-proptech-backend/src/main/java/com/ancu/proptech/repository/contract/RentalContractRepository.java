package com.ancu.proptech.repository.contract;
import com.ancu.proptech.model.contract.RentalContract;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface RentalContractRepository extends JpaRepository<RentalContract,Long> {
    @org.springframework.data.jpa.repository.Query("select c.id from RentalContract c where c.status=com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE order by c.id")
    java.util.List<Long> findActiveBillingIds();

    String CURRENT_OWNER=" from RentalContract c where c.apartment.property.owner.id=:ownerId "
        + "and (:propertyId is null or c.apartment.property.id=:propertyId) "
        + "and c.status=com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE and c.startDate<=:today ";
    @Query("select count(c)"+CURRENT_OWNER+"and c.endDate between :today and :through")
    long countExpiring(@Param("ownerId") Long ownerId,@Param("propertyId") Long propertyId,
        @Param("today") java.time.LocalDate today,@Param("through") java.time.LocalDate through);
    @Query("select count(c)"+CURRENT_OWNER+"and c.endDate<:today")
    long countExpired(@Param("ownerId") Long ownerId,@Param("propertyId") Long propertyId,@Param("today") java.time.LocalDate today);
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
    Optional<RentalContract> findFirstByApartmentIdAndCustomerIdOrderByStartDateDescIdDesc(Long apartmentId,Long customerId);
    List<RentalContract> findByRenewalOfContractIdAndStatusNot(Long id,RentalContract.Status status);
    List<RentalContract> findByRenewalOfContractIdOrderByIdDesc(Long id);
    List<RentalContract> findByApartmentId(Long apartmentId);
    boolean existsByCustomerIdAndLocalFixtureTrue(Long customerId);
    long countByLocalFixtureTrue();
}
