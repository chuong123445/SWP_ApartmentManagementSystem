package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyExternalImport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyExternalImportRepository extends JpaRepository<PropertyExternalImport,Long> {
    boolean existsByIssuerAndExternalAssetId(String issuer,String externalAssetId);
}
