package com.ancu.proptech.repository.billing;

import com.ancu.proptech.model.billing.MaintenanceCharge;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MaintenanceChargeRepository extends JpaRepository<MaintenanceCharge,Long> {
    @Query("select m from MaintenanceCharge m where m.contract.id=:contract and m.invoice is null and m.period<=:period order by m.period,m.ticketId")
    List<MaintenanceCharge> pending(@Param("contract") Long contract,@Param("period") String period);
    List<MaintenanceCharge> findByInvoiceId(Long invoice);
}
