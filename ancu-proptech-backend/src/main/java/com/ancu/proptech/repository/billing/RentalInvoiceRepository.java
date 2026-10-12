package com.ancu.proptech.repository.billing;
import com.ancu.proptech.model.billing.RentalInvoice;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface RentalInvoiceRepository extends JpaRepository<RentalInvoice,UUID> {
    @Query("select i.contract.id from RentalInvoice i where i.id=:id")
    Optional<UUID> findContractId(@org.springframework.data.repository.query.Param("id") UUID id);
    boolean existsByContractIdAndPeriod(UUID contractId,String period);
    boolean existsByContractIdAndStatus(UUID contractId,RentalInvoice.Status status);
    Optional<RentalInvoice> findFirstByContractIdAndStatusOrderByPeriodDesc(UUID contractId,RentalInvoice.Status status);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.apartment.property.owner","contract.customer"})
    Page<RentalInvoice> findByContractApartmentPropertyOwnerId(UUID ownerId,Pageable pageable);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.customer"})
    Page<RentalInvoice> findByContractCustomerIdAndStatus(UUID customerId,RentalInvoice.Status status,Pageable pageable);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.apartment.property.owner","contract.customer"})
    Optional<RentalInvoice> findWithContractById(UUID id);
}
