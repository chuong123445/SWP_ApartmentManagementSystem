package com.ancu.proptech.repository.finance;
import com.ancu.proptech.dto.finance.*;
import com.ancu.proptech.model.billing.RentalInvoice;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;

public interface FinancialReportRepository extends Repository<RentalInvoice,Long> {
    @Query("""
        select new com.ancu.proptech.dto.finance.TenantInvoiceTotals(
            count(case when p.paidAt is not null then 1 else null end),
            coalesce(sum(case when p.paidAt is not null then i.totalAmount else 0 end), 0),
            count(case when p.paidAt is null then 1 else null end),
            coalesce(sum(case when p.paidAt is null then i.totalAmount else 0 end), 0))
        from RentalInvoice i left join InvoicePayment p on p.invoiceId = i.id
        where i.contract.customer.id = :customerId and i.status = :status and i.kind = :kind
        """)
    TenantInvoiceTotals tenantInvoices(@Param("customerId") Long customerId,
        @Param("status") RentalInvoice.Status status, @Param("kind") RentalInvoice.Kind kind);

    @Query("""
        select new com.ancu.proptech.dto.finance.TenantInvoiceTotals(
            count(case when p.paidAt is not null then 1 else null end),
            coalesce(sum(case when p.paidAt is not null then p.amount else 0 end), 0),
            count(case when p.paidAt is null then 1 else null end),
            coalesce(sum(case when p.paidAt is null then p.amount else 0 end), 0))
        from TestPayment p, RentalContract c
        where p.customerId = :customerId and p.contractId = c.id
          and c.customer.id = :customerId and p.ownerId = c.apartment.property.owner.id
        """)
    TenantInvoiceTotals tenantAdditionalInvoices(@Param("customerId") Long customerId);

    @Query("select new com.ancu.proptech.dto.finance.FinancialInvoiceRow(i.contract.apartment.property.id,i.period,i.dueDate,i.monthlyRent,i.electricityAmount,i.waterAmount,i.internetFee,i.garbageFee,i.totalAmount,p.amount,p.paidAt,i.coverageStart,i.coverageEnd) from RentalInvoice i left join InvoicePayment p on p.invoiceId=i.id where i.contract.apartment.property.owner.id=:ownerId and (:propertyId is null or i.contract.apartment.property.id=:propertyId) and i.status=com.ancu.proptech.model.billing.RentalInvoice.Status.SENT")
    @QueryHints(@jakarta.persistence.QueryHint(name="org.hibernate.fetchSize",value="100"))
    Stream<FinancialInvoiceRow> invoices(@Param("ownerId") Long ownerId,@Param("propertyId") Long propertyId);

    @Query("select new com.ancu.proptech.dto.finance.FinancialReceiptRow(c.apartment.property.id,p.amount,p.paidAt) from TestPayment p, RentalContract c where p.contractId=c.id and p.ownerId=:ownerId and c.apartment.property.owner.id=:ownerId and p.customerId=c.customer.id and (:propertyId is null or c.apartment.property.id=:propertyId) and (p.paidAt is null or (p.paidAt>=:from and p.paidAt<:until))")
    @QueryHints(@jakarta.persistence.QueryHint(name="org.hibernate.fetchSize",value="100"))
    Stream<FinancialReceiptRow> receipts(@Param("ownerId") Long ownerId,@Param("propertyId") Long propertyId,@Param("from") Instant from,@Param("until") Instant until);

    @Query("select new com.ancu.proptech.dto.finance.FinancialInventoryRow(p.id,p.name,count(a.id),sum(case when a.availability=com.ancu.proptech.model.apartment.Apartment.Availability.OCCUPIED then 1 else 0 end),sum(case when a.availability=com.ancu.proptech.model.apartment.Apartment.Availability.VACANT then 1 else 0 end)) from Property p left join Apartment a on a.property.id=p.id where p.owner.id=:ownerId and (:propertyId is null or p.id=:propertyId) group by p.id,p.name order by p.name,p.id")
    List<FinancialInventoryRow> inventory(@Param("ownerId") Long ownerId,@Param("propertyId") Long propertyId);
}
