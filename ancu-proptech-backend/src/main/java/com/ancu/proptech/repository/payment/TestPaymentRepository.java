package com.ancu.proptech.repository.payment;
import com.ancu.proptech.model.payment.TestPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface TestPaymentRepository extends JpaRepository<TestPayment,Long> {
 Optional<TestPayment> findByIdAndCustomerId(Long id,Long customerId);
 Optional<TestPayment> findByPaymentCode(String code);
 List<TestPayment> findTop20ByOwnerIdOrderByIdDesc(Long ownerId);
 List<TestPayment> findTop20ByCustomerIdOrderByIdDesc(Long customerId);
}
