package com.ancu.proptech.repository.payment;

import com.ancu.proptech.model.payment.SettlementEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface SettlementEntryRepository extends JpaRepository<SettlementEntry, Long> {
    interface Total {
        SettlementEntry.Kind getKind();
        BigDecimal getTotal();
    }

    @Query("select e.kind as kind, sum(e.amount) as total from SettlementEntry e where e.ownerId = :ownerId group by e.kind")
    List<Total> totals(@Param("ownerId") Long ownerId);

    List<SettlementEntry> findTop50ByOwnerIdOrderByIdDesc(Long ownerId);
}
