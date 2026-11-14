package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyListingDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PropertyListingDraftRepository extends JpaRepository<PropertyListingDraft,Long> {
    boolean existsByPropertyIdAndCompletedFalse(Long propertyId);
    Optional<PropertyListingDraft> findByRequestKey(String key);
    List<PropertyListingDraft> findByAccountIdAndCompletedFalseOrderByUpdatedAtDesc(Long accountId);
}
