package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyExternalImport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface PropertyExternalImportRepository extends JpaRepository<PropertyExternalImport,UUID> {
    boolean existsByIssuerAndExternalAssetId(String issuer,String externalAssetId);
}
