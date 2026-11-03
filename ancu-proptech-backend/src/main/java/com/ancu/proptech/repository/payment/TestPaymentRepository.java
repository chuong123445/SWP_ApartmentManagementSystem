package com.ancu.proptech.repository.payment;
import com.ancu.proptech.model.payment.TestPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface TestPaymentRepository extends JpaRepository<TestPayment,Long> {
 String RECEIVED_OWNER=" from TestPayment p, RentalContract c where p.contractId=c.id and p.ownerId=:ownerId "
  + "and c.apartment.property.owner.id=:ownerId and p.customerId=c.customer.id "
  + "and (:propertyId is null or c.apartment.property.id=:propertyId) "
  + "and (:paid is null or (:paid=true and p.paidAt is not null) or (:paid=false and p.paidAt is null))";
 @Query(value="select p"+RECEIVED_OWNER,countQuery="select count(p)"+RECEIVED_OWNER)
 Page<TestPayment> ownerReceived(@Param("ownerId") Long ownerId,@Param("propertyId") Long propertyId,@Param("paid") Boolean paid,Pageable page);
 @Query("select p"+RECEIVED_OWNER+" and p.id=:id")
 Optional<TestPayment> ownerReceivedDetail(@Param("ownerId") Long ownerId,@Param("propertyId") Long propertyId,@Param("paid") Boolean paid,@Param("id") Long id);
 Optional<TestPayment> findByIdAndCustomerId(Long id,Long customerId);
 boolean existsByCollectionOwnerId(Long ownerId);
 Optional<TestPayment> findByPaymentCode(String code);
 List<TestPayment> findTop20ByOwnerIdOrderByIdDesc(Long ownerId);
 List<TestPayment> findTop20ByCustomerIdOrderByIdDesc(Long customerId);
 List<TestPayment> findTop20ByCustomerIdAndPaidAtIsNullOrderByIdDesc(Long customerId);
 List<TestPayment> findTop20ByCustomerIdAndPaidAtIsNotNullOrderByIdDesc(Long customerId);
}
