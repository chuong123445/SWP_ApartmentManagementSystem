package com.ancu.proptech.repository.finance;
import com.ancu.proptech.model.finance.CashEntry;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface CashEntryRepository extends JpaRepository<CashEntry,Long>, JpaSpecificationExecutor<CashEntry> {
    Optional<CashEntry> findByPropertyIdAndRequestKey(Long propertyId,String requestKey);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CashEntry e where e.id=:id and e.property.owner.id=:owner")
    Optional<CashEntry> lockOwned(@Param("id") Long id,@Param("owner") Long owner);
}
