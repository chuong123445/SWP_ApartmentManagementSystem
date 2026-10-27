package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyDossier;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface PropertyDossierRepository extends JpaRepository<PropertyDossier,UUID> {
    boolean existsByPropertyId(UUID propertyId);
    boolean existsByPropertyIdAndStatus(UUID propertyId,PropertyDossier.Status status);
    List<PropertyDossier> findByPropertyIdOrderBySubmittedAtDescIdDesc(UUID propertyId);
    @Query("select d.property.id from PropertyDossier d where d.id=:id") Optional<UUID> findPropertyId(@Param("id") UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select d from PropertyDossier d where d.id=:id") Optional<PropertyDossier> lockById(@Param("id") UUID id);
    Page<PropertyDossier> findByStatus(PropertyDossier.Status status,Pageable pageable);
    @Query("select count(d) from PropertyDossier d join d.files f where f.id=:fileId") long countSubmittedFile(@Param("fileId") UUID fileId);
}
