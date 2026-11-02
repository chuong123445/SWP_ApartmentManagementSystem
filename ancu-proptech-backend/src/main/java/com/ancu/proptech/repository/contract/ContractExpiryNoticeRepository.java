package com.ancu.proptech.repository.contract;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Map;

@Repository @RequiredArgsConstructor
public class ContractExpiryNoticeRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public int generate(LocalDate today) {
        return jdbc.update("""
            INSERT INTO contract_expiry_notices(contract_id,recipient_id,expires_on,days_before,created_at)
            SELECT c.id,party.account_id,c.end_date,d.days_before,SYSUTCDATETIME()
            FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id
            CROSS APPLY (VALUES(c.customer_id),(p.owner_id)) party(account_id)
            CROSS APPLY (VALUES(20),(10)) d(days_before)
            WHERE c.status='ACTIVE' AND EXISTS(SELECT 1 FROM contract_drafts cd WHERE cd.contract_id=c.id)
             AND ((d.days_before=20 AND DATEDIFF(day,CAST(:today AS date),c.end_date) BETWEEN 11 AND 20)
               OR (d.days_before=10 AND DATEDIFF(day,CAST(:today AS date),c.end_date) BETWEEN 0 AND 10))
             AND NOT EXISTS(SELECT 1 FROM contract_expiry_notices n WITH(UPDLOCK,HOLDLOCK)
              WHERE n.contract_id=c.id AND n.recipient_id=party.account_id AND n.expires_on=c.end_date AND n.days_before=d.days_before)
            """,Map.of("today",today.toString()));
    }
}
