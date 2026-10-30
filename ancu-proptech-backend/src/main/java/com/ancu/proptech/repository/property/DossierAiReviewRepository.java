package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.DossierAiReview;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
public interface DossierAiReviewRepository extends JpaRepository<DossierAiReview,Long> {
    Optional<DossierAiReview> findByDossierId(Long dossierId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select r from DossierAiReview r where r.dossierId=:dossierId")
    Optional<DossierAiReview> lockByDossierId(@Param("dossierId") Long dossierId);
    Optional<DossierAiReview> findFirstByStateInAndNextAttemptAtLessThanEqualOrderByCreatedAtAscIdAsc(List<DossierAiReview.State> states,Instant now);
    Optional<DossierAiReview> findFirstByStateAndStartedAtBeforeOrderByStartedAtAsc(DossierAiReview.State state,Instant cutoff);
}
