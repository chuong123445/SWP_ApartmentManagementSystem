package com.ancu.proptech.repository.billing;
import com.ancu.proptech.model.billing.RentalInvoice;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface RentalInvoiceRepository extends JpaRepository<RentalInvoice,Long> {
    @Query("select i.contract.id from RentalInvoice i where i.id=:id")
    Optional<Long> findContractId(@org.springframework.data.repository.query.Param("id") Long id);
    boolean existsByContractIdAndPeriod(Long contractId,String period);
    boolean existsByContractIdAndStatus(Long contractId,RentalInvoice.Status status);
    Optional<RentalInvoice> findFirstByContractIdAndStatusOrderByPeriodDesc(Long contractId,RentalInvoice.Status status);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.apartment.property.owner","contract.customer"})
    Page<RentalInvoice> findByContractApartmentPropertyOwnerId(Long ownerId,Pageable pageable);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.apartment.property.owner","contract.customer"})
    Page<RentalInvoice> findByContractApartmentPropertyOwnerIdAndContractApartmentPropertyId(Long ownerId,Long propertyId,Pageable pageable);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.customer"})
    Page<RentalInvoice> findByContractCustomerIdAndStatus(Long customerId,RentalInvoice.Status status,Pageable pageable);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.customer"})
    @Query("select i from RentalInvoice i where i.contract.customer.id=:customerId and i.status=:status and "
        + "((:paid=true and exists (select p.id from InvoicePayment p where p.invoiceId=i.id and p.paidAt is not null)) or "
        + "(:paid=false and not exists (select p.id from InvoicePayment p where p.invoiceId=i.id and p.paidAt is not null)))")
    Page<RentalInvoice> findByCustomerAndPaymentStatus(Long customerId,RentalInvoice.Status status,boolean paid,Pageable pageable);
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.apartment.property.owner","contract.customer"})
    Optional<RentalInvoice> findWithContractById(Long id);
}
