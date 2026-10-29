package com.ancu.proptech.repository.maintenance;
import com.ancu.proptech.model.maintenance.MaintenanceTicket;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import org.springframework.data.repository.query.Param;
public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicket,Long> {
    @Query("select t from MaintenanceTicket t where t.property.owner.id=:owner and (:property is null or t.property.id=:property)")
    Page<MaintenanceTicket> ownerTickets(@Param("owner") Long owner,@Param("property") Long property,Pageable page);
    Page<MaintenanceTicket> findByReporterId(Long reporter,Pageable page);
    @Query("select t from MaintenanceTicket t where t.reporter.id=:account or t.tenant.id=:account")
    Page<MaintenanceTicket> mine(@Param("account") Long account,Pageable page);
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from MaintenanceTicket t where t.id=:id")
    java.util.Optional<MaintenanceTicket> lock(@Param("id") Long id);
}
