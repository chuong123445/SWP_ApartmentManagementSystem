package com.ancu.proptech.repository.payment;
import com.ancu.proptech.model.payment.SepayEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SepayEventRepository extends JpaRepository<SepayEvent,Long>{
 boolean existsByInvoiceIdAndResultInAndAmountGreaterThan(Long invoiceId,Collection<String> results,java.math.BigDecimal amount);
 Optional<SepayEvent> findByOwnerIdAndTransactionId(Long ownerId,Long id);
 List<SepayEvent> findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(Long ownerId);
}
