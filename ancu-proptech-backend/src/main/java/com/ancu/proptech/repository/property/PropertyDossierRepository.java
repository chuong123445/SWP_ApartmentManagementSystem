package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyDossier;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface PropertyDossierRepository extends JpaRepository<PropertyDossier,Long> {
    boolean existsByPropertyId(Long propertyId);
    boolean existsByPropertyIdAndStatus(Long propertyId,PropertyDossier.Status status);
    List<PropertyDossier> findByPropertyIdOrderBySubmittedAtDescIdDesc(Long propertyId);
    @Query("select d.property.id from PropertyDossier d where d.id=:id") Optional<Long> findPropertyId(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select d from PropertyDossier d where d.id=:id") Optional<PropertyDossier> lockById(@Param("id") Long id);
    Page<PropertyDossier> findByStatus(PropertyDossier.Status status,Pageable pageable);
    @Query("select count(d) from PropertyDossier d join d.files f where f.id=:fileId") long countSubmittedFile(@Param("fileId") Long fileId);
}
