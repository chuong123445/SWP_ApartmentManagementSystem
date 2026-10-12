package com.ancu.proptech.repository.billing;
import com.ancu.proptech.model.billing.InvoiceNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface InvoiceNotificationRepository extends JpaRepository<InvoiceNotification,UUID> {
    long countByInvoiceId(UUID invoiceId);
}
