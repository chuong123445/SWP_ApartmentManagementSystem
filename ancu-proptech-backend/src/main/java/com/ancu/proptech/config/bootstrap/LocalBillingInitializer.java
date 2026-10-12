package com.ancu.proptech.config.bootstrap;
import com.ancu.proptech.service.bootstrap.LocalBillingDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
@Component @Profile("local") @Order(100) @RequiredArgsConstructor
public class LocalBillingInitializer implements ApplicationRunner {
    private final LocalBillingDataService data;
    @Value("${app.seed.enabled:true}") private boolean seedEnabled;
    @Value("${app.billing.local-fixtures:true}") private boolean enabled;
    @Value("${app.auth.local-owner-email:}") private String owner;
    @Value("${app.billing.tenant-one-email}") private String one;
    @Value("${app.billing.tenant-one-password:}") private String onePassword;
    @Value("${app.billing.tenant-two-email}") private String two;
    @Value("${app.billing.tenant-two-password:}") private String twoPassword;
    @Override public void run(ApplicationArguments args){if(seedEnabled&&enabled)data.initialize(owner,one,onePassword,two,twoPassword);}
}
