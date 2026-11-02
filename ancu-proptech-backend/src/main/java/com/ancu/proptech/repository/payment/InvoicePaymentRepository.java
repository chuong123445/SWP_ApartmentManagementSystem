package com.ancu.proptech.repository.payment;
import com.ancu.proptech.model.payment.InvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface InvoicePaymentRepository extends JpaRepository<InvoicePayment,Long>{
 Optional<InvoicePayment> findByInvoiceId(Long id);
 Optional<InvoicePayment> findByPaymentCode(String code);
}
