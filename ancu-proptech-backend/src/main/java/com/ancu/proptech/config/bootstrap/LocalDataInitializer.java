package com.ancu.proptech.config.bootstrap;
import com.ancu.proptech.service.bootstrap.LocalDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
@Component @Profile("local") @org.springframework.core.annotation.Order(0) @RequiredArgsConstructor
public class LocalDataInitializer implements ApplicationRunner {
    private final LocalDataService data;
    @Value("${app.seed.enabled:true}") private boolean enabled;
    @Value("${app.auth.local-owner-email:}") private String ownerEmail;
    @Value("${app.auth.local-owner-password:}") private String ownerPassword;
    @Value("${app.auth.local-customer-email:}") private String customerEmail;
    @Value("${app.auth.local-customer-password:}") private String customerPassword;
    @Override public void run(ApplicationArguments arguments) {
        if (enabled) data.initializeIfEmpty(ownerEmail, ownerPassword, customerEmail, customerPassword);
    }
}
