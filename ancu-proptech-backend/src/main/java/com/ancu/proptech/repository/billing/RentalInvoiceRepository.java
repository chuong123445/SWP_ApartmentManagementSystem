package com.ancu.proptech.repository.billing;
import com.ancu.proptech.model.billing.RentalInvoice;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface RentalInvoiceRepository extends JpaRepository<RentalInvoice,Long> {
    String OWNER_HISTORY=" from RentalInvoice i where i.contract.apartment.property.owner.id=:ownerId "
        + "and (:propertyId is null or i.contract.apartment.property.id=:propertyId) and (:status is null or i.status=:status) "
        + "and (:paid is null or (i.status=com.ancu.proptech.model.billing.RentalInvoice.Status.SENT and "
        + "((:paid=true and exists (select p.id from InvoicePayment p where p.invoiceId=i.id and p.paidAt is not null)) or "
        + "(:paid=false and not exists (select p.id from InvoicePayment p where p.invoiceId=i.id and p.paidAt is not null)))))";
    @EntityGraph(attributePaths={"contract","contract.apartment","contract.apartment.property","contract.apartment.property.owner","contract.customer"})
    @Query(value="select i"+OWNER_HISTORY,countQuery="select count(i)"+OWNER_HISTORY)
    Page<RentalInvoice> ownerHistory(@org.springframework.data.repository.query.Param("ownerId") Long ownerId,
        @org.springframework.data.repository.query.Param("propertyId") Long propertyId,
        @org.springframework.data.repository.query.Param("status") RentalInvoice.Status status,
        @org.springframework.data.repository.query.Param("paid") Boolean paid,Pageable page);
    @Query("select count(i)"+OWNER_HISTORY)
    long countOwnerHistory(@org.springframework.data.repository.query.Param("ownerId") Long ownerId,
        @org.springframework.data.repository.query.Param("propertyId") Long propertyId,
        @org.springframework.data.repository.query.Param("status") RentalInvoice.Status status,
        @org.springframework.data.repository.query.Param("paid") Boolean paid);
    @Query("select i.contract.id from RentalInvoice i where i.id=:id")
    Optional<Long> findContractId(@org.springframework.data.repository.query.Param("id") Long id);
    boolean existsByContractIdAndPeriodAndStatusNot(Long contractId,String period,RentalInvoice.Status status);
    boolean existsByContractIdAndPeriodAndKindNotAndStatusNot(Long contractId,String period,RentalInvoice.Kind kind,RentalInvoice.Status status);
    boolean existsByContractIdAndPeriodGreaterThanAndKindNotAndStatusNot(Long contractId,String period,RentalInvoice.Kind kind,RentalInvoice.Status status);
    boolean existsByContractIdAndKindNotAndStatus(Long contractId,RentalInvoice.Kind kind,RentalInvoice.Status status);
    Optional<RentalInvoice> findFirstByContractIdAndKindNotAndStatusOrderByPeriodDesc(Long contractId,RentalInvoice.Kind kind,RentalInvoice.Status status);
    List<RentalInvoice> findByContractIdAndStatusNotOrderByPeriodAsc(Long contractId,RentalInvoice.Status status);
    // Fixture provisioning must also respect retained cancelled documents.
    boolean existsByContractIdAndPeriod(Long contractId,String period);
    boolean existsByContractIdAndPeriodGreaterThanAndStatusNot(Long contractId,String period,RentalInvoice.Status status);
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
