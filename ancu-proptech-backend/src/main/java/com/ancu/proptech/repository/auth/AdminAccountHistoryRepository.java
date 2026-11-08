package com.ancu.proptech.repository.auth;

import com.ancu.proptech.dto.auth.AdminAccountDtos.Contract;
import com.ancu.proptech.dto.auth.AdminAccountDtos.PaidInvoice;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Repository
@RequiredArgsConstructor
public class AdminAccountHistoryRepository {
    private final JdbcTemplate jdbc;

    private static final String CONTRACT_FROM = """
        FROM dbo.rental_contracts c
        JOIN dbo.rental_apartments a ON a.id=c.apartment_id
        JOIN dbo.rental_properties property ON property.id=a.property_id
        JOIN dbo.auth_accounts landlord ON landlord.id=property.owner_id
        JOIN dbo.auth_accounts tenant ON tenant.id=c.customer_id
        WHERE property.owner_id=? OR c.customer_id=?
        """;

    private static final String PAID_HISTORY = """
        SELECT i.id, 'MONTHLY' AS source, c.id AS contract_id, i.period, a.room_number,
               landlord.full_name AS owner_name, tenant.full_name AS tenant_name, i.total_amount AS amount, payment.paid_at
        FROM dbo.rental_invoices i
        JOIN dbo.invoice_payments payment ON payment.invoice_id=i.id
        JOIN dbo.rental_contracts c ON c.id=i.contract_id
        JOIN dbo.rental_apartments a ON a.id=c.apartment_id
        JOIN dbo.rental_properties property ON property.id=a.property_id
        JOIN dbo.auth_accounts landlord ON landlord.id=property.owner_id
        JOIN dbo.auth_accounts tenant ON tenant.id=c.customer_id
        WHERE payment.paid_at IS NOT NULL AND i.status='SENT' AND (property.owner_id=? OR c.customer_id=?)
        UNION ALL
        SELECT receipt.id, 'ADDITIONAL', c.id, CAST(NULL AS VARCHAR(7)), a.room_number,
               landlord.full_name, tenant.full_name, receipt.amount, receipt.paid_at
        FROM dbo.sepay_test_payments receipt
        JOIN dbo.rental_contracts c ON c.id=receipt.contract_id AND c.customer_id=receipt.customer_id
        JOIN dbo.rental_apartments a ON a.id=c.apartment_id
        JOIN dbo.rental_properties property ON property.id=a.property_id AND property.owner_id=receipt.owner_id
        JOIN dbo.auth_accounts landlord ON landlord.id=property.owner_id
        JOIN dbo.auth_accounts tenant ON tenant.id=c.customer_id
        WHERE receipt.paid_at IS NOT NULL AND (property.owner_id=? OR c.customer_id=?)
        """;

    public Page<Contract> contracts(Long accountId, Pageable page) {
        long count = jdbc.queryForObject("SELECT COUNT_BIG(*) " + CONTRACT_FROM, Long.class, accountId, accountId);
        String sql = """
            SELECT c.id, property.owner_id, a.room_number, property.name AS property_name,
                   landlord.full_name AS owner_name, tenant.full_name AS tenant_name,
                   c.status, c.start_date, c.end_date, c.monthly_rent
            """ + CONTRACT_FROM + " ORDER BY c.id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
        var rows = jdbc.query(sql, (rs, row) -> new Contract(
                rs.getString("id"), rs.getLong("owner_id") == accountId ? "OWNER" : "TENANT",
                rs.getString("room_number"), rs.getString("property_name"), rs.getString("owner_name"),
                rs.getString("tenant_name"), rs.getString("status"), rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date").toLocalDate(), rs.getBigDecimal("monthly_rent").toPlainString()),
                accountId, accountId, page.getOffset(), page.getPageSize());
        return new PageImpl<>(rows, page, count);
    }

    public Page<PaidInvoice> paidInvoices(Long accountId, Pageable page) {
        long count = jdbc.queryForObject("SELECT COUNT_BIG(*) FROM (" + PAID_HISTORY + ") history",
                Long.class, accountId, accountId, accountId, accountId);
        String sql = "SELECT * FROM (" + PAID_HISTORY
                + ") history ORDER BY paid_at DESC, id DESC, source ASC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
        var rows = jdbc.query(sql, (rs, row) -> new PaidInvoice(
                rs.getString("id"), rs.getString("source"), rs.getString("contract_id"),
                rs.getString("period"), rs.getString("room_number"), rs.getString("owner_name"),
                rs.getString("tenant_name"), rs.getBigDecimal("amount").toPlainString(),
                rs.getObject("paid_at", LocalDateTime.class).toInstant(ZoneOffset.UTC)),
                accountId, accountId, accountId, accountId, page.getOffset(), page.getPageSize());
        return new PageImpl<>(rows, page, count);
    }
}
