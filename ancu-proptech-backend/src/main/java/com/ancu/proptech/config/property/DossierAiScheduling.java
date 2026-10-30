package com.ancu.proptech.config.property;
import com.ancu.proptech.service.property.ai.DossierAiWorker;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.*;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration @EnableScheduling @RequiredArgsConstructor
@ConditionalOnProperty(name="app.dossier-ai.scheduler-enabled",havingValue="true",matchIfMissing=true)
public class DossierAiScheduling {
    private final DossierAiWorker worker;
    @Bean(name="dossierAiScheduler") public ThreadPoolTaskScheduler scheduler(){var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("dossier-ai-");scheduler.setDaemon(true);return scheduler;}
    @Scheduled(scheduler="dossierAiScheduler",initialDelayString="${app.dossier-ai.initial-delay-ms:10000}",fixedDelayString="${app.dossier-ai.poll-ms:5000}")
    public void run(){worker.runOnce();}
}
