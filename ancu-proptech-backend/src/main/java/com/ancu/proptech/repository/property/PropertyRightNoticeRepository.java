package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyRightNotice;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
public interface PropertyRightNoticeRepository extends JpaRepository<PropertyRightNotice,UUID> {
    boolean existsByDossierIdAndKind(UUID dossierId,String kind);
    @EntityGraph(attributePaths="property") List<PropertyRightNotice> findByRecipientIdOrderByCreatedAtDescIdDesc(UUID recipientId,Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select n from PropertyRightNotice n where n.id=:id") Optional<PropertyRightNotice> lockById(@Param("id") UUID id);
    @Query("select n.id from PropertyRightNotice n where n.emailStatus in ('PENDING','RETRY','SENDING') and n.nextAttemptAt<=:now and n.attempts<=5 order by n.nextAttemptAt,n.id") List<UUID> due(@Param("now") Instant now,Pageable pageable);
}
