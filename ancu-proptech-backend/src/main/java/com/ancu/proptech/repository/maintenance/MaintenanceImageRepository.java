package com.ancu.proptech.repository.maintenance;
import com.ancu.proptech.model.maintenance.MaintenanceImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MaintenanceImageRepository extends JpaRepository<MaintenanceImage,Long> {
 interface Metadata {Long getId();String getKind();}
 List<Metadata> findByTicketIdOrderByIdAsc(Long id);
 long countByTicketId(Long id);
}
