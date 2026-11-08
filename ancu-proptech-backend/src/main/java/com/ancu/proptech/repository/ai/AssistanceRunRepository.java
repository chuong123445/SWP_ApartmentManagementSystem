package com.ancu.proptech.repository.ai;
import com.ancu.proptech.model.ai.AssistanceRun;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface AssistanceRunRepository extends JpaRepository<AssistanceRun,String> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select r from AssistanceRun r where r.id=:id") Optional<AssistanceRun> lockById(@org.springframework.data.repository.query.Param("id") String id);
}
