package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyEvidenceFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface PropertyEvidenceFileRepository extends JpaRepository<PropertyEvidenceFile,UUID> {
    long countByPropertyId(UUID propertyId);
}
