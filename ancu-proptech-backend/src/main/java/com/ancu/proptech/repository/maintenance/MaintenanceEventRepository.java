package com.ancu.proptech.repository.maintenance;
import com.ancu.proptech.model.maintenance.MaintenanceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MaintenanceEventRepository extends JpaRepository<MaintenanceEvent,Long> {
 List<MaintenanceEvent> findByTicketIdOrderByIdAsc(Long id);
}
