package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyEvidenceFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyEvidenceFileRepository extends JpaRepository<PropertyEvidenceFile,Long> {
    java.util.List<PropertyEvidenceFile> findByPropertyIdOrderByIdAsc(Long propertyId);
    long countByPropertyId(Long propertyId);
}
