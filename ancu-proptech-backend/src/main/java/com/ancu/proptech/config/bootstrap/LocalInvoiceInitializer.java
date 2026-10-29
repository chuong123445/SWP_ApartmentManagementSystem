package com.ancu.proptech.config.bootstrap;

import com.ancu.proptech.service.bootstrap.LocalInvoiceFixtureService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Seeds historical invoice data (T05 → month before current) for local-fixture contracts.
 * Runs after LocalBillingInitializer (Order 100) so contracts already exist.
 * Idempotent: skips periods that already have invoices.
 */
@Component
@Profile("local")
@Order(200)
@RequiredArgsConstructor
public class LocalInvoiceInitializer implements ApplicationRunner {

    private final LocalInvoiceFixtureService invoiceFixtures;

    @Value("${app.seed.enabled:true}") private boolean seedEnabled;
    @Value("${app.billing.local-fixtures:true}") private boolean enabled;

    @Override
    public void run(ApplicationArguments args) {
        if (seedEnabled && enabled) {
            invoiceFixtures.seedHistoricalInvoices();
        }
    }
}

