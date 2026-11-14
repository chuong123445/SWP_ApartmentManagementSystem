package com.ancu.proptech.repository.identity;
import com.ancu.proptech.model.identity.IdentitySubmission;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import java.util.Optional;
public interface IdentitySubmissionRepository extends JpaRepository<IdentitySubmission,Long> {
 Optional<IdentitySubmission> findFirstByAccountIdOrderByIdDesc(Long accountId);
 boolean existsByAccountIdAndStatus(Long accountId,IdentitySubmission.Status status);
 Page<IdentitySubmission> findByStatus(IdentitySubmission.Status status,Pageable page);
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 @Query("select s from IdentitySubmission s where s.id=:id")
 Optional<IdentitySubmission> lockById(@org.springframework.data.repository.query.Param("id") Long id);
}
