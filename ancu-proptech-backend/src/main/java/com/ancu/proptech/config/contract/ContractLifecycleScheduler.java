package com.ancu.proptech.config.contract;
import com.ancu.proptech.repository.contract.ContractDraftRepository;
import com.ancu.proptech.service.contract.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.time.*;

@Configuration @EnableScheduling @Profile("!test") @RequiredArgsConstructor
@ConditionalOnProperty(name="app.contract-lifecycle.scheduler-enabled",havingValue="true",matchIfMissing=true)
public class ContractLifecycleScheduler {
    private final ContractExpiryService expiry;
    private final ContractDraftRepository drafts;
    private final ContractRenewalActivationService activation;
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(ContractLifecycleScheduler.class);
    @Scheduled(initialDelayString="${app.contract-lifecycle.initial-delay-ms:60000}",fixedDelayString="${app.contract-lifecycle.delay-ms:3600000}")
    public void run() {
        var today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        expiry.generate(today);
        for(Long id:drafts.dueSignedRenewals(today)) {
            try{activation.activate(id);}catch(RuntimeException error){log.warn("Renewal activation deferred for contract {} ({})",id,error.getClass().getSimpleName());}
        }
    }
}
