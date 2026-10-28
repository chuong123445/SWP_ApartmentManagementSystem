package com.ancu.proptech.repository.billing;
import com.ancu.proptech.model.billing.InvoiceNotification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceNotificationRepository extends JpaRepository<InvoiceNotification,Long> {
    long countByInvoiceId(Long invoiceId);
}
