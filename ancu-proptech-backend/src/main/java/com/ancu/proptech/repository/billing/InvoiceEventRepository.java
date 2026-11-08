package com.ancu.proptech.repository.billing;

import com.ancu.proptech.model.billing.InvoiceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface InvoiceEventRepository extends JpaRepository<InvoiceEvent,Long> {
    List<InvoiceEvent> findByInvoiceIdOrderByIdAsc(Long invoiceId);
    Optional<InvoiceEvent> findFirstByInvoiceIdAndActionOrderByIdDesc(Long invoiceId,InvoiceEvent.Action action);
}
