package com.ancu.proptech.config.property;
import com.ancu.proptech.service.property.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
@Configuration @EnableScheduling @RequiredArgsConstructor
@ConditionalOnProperty(name="app.property-rights.scheduler-enabled",havingValue="true",matchIfMissing=true)
public class PropertyRightsScheduling {
    private final PropertyRightNoticeService notices;private final PropertyRightsPolicy rights;
    @Scheduled(initialDelayString="${app.property-rights.initial-delay-ms:3600000}",fixedDelayString="${app.property-rights.interval-ms:3600000}")
    public void run(){notices.generate(rights.today());notices.deliver();}
}
