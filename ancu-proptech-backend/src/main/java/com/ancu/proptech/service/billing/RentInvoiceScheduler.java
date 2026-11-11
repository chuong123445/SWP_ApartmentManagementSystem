package com.ancu.proptech.service.billing;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component @RequiredArgsConstructor @Slf4j
@ConditionalOnProperty(name="app.billing.rent-scheduler-enabled",havingValue="true",matchIfMissing=true)
public class RentInvoiceScheduler {
    private final InvoiceService invoices;
    @Scheduled(fixedDelayString="${app.billing.rent-delay-ms:900000}",initialDelayString="${app.billing.rent-initial-delay-ms:60000}")
    public void prepare(){
        for(Long id:invoices.scheduledRentContracts()){
            try{invoices.prepareScheduledRent(id);}catch(RuntimeException error){log.warn("Rent billing retry required for contract {} ({})",id,error.getClass().getSimpleName());}
        }
    }
}
