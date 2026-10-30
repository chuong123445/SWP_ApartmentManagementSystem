package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.OwnerPaymentQr;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface OwnerPaymentQrRepository extends JpaRepository<OwnerPaymentQr,Long> {
 Optional<OwnerPaymentQr> findFirstByOwnerIdAndPropertyIdIsNullAndConfirmedAtNotNullOrderByConfirmedAtDescIdDesc(Long ownerId);
 Optional<OwnerPaymentQr> findFirstByOwnerIdAndPropertyIdAndConfirmedAtNotNullOrderByConfirmedAtDescIdDesc(Long ownerId,Long propertyId);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select q from OwnerPaymentQr q where q.id=:id and q.ownerId=:owner")
 Optional<OwnerPaymentQr> lockOwned(@Param("id") Long id,@Param("owner") Long owner);
}
