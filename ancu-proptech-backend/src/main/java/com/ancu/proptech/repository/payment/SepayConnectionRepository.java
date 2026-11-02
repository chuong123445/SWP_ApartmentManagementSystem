package com.ancu.proptech.repository.payment;
import com.ancu.proptech.model.payment.SepayConnection;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface SepayConnectionRepository extends JpaRepository<SepayConnection,Long>{
 Optional<SepayConnection> findByOwnerId(Long ownerId);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from SepayConnection c where c.ownerId=:id")
 Optional<SepayConnection> lockOwner(@Param("id") Long id);
}
