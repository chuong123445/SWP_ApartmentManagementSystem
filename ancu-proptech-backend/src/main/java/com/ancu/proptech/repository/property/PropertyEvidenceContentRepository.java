package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyEvidenceContent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface PropertyEvidenceContentRepository extends JpaRepository<PropertyEvidenceContent,UUID> {}
