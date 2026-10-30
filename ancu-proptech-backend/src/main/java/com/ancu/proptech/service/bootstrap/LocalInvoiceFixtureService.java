package com.ancu.proptech.service.bootstrap;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.billing.InvoiceNotification;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.repository.billing.InvoiceNotificationRepository;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * Seeds historical invoice fixtures (SENT) for each local-fixture ACTIVE contract,
 * covering the months from contract start up to (but not including) the current month.
 *
 * Rules:
 * - Idempotent: skips any period that already has an invoice for that contract.
 * - Only runs for local_fixture=true contracts.
 * - Meter readings increase by a fixed delta each month (electricity +50, water +10).
 * - Due date is set to the 15th of the billing month.
 * - All seeded invoices are SENT (visible to tenant) with a backdated sentAt timestamp.
 * - A matching InvoiceNotification is created for each SENT invoice.
 * - Does NOT touch billing version on the contract (fixtures bypass the chain lock).
 */
@Slf4j
@Service
@Profile("local")
@RequiredArgsConstructor
public class LocalInvoiceFixtureService {

    private final RentalContractRepository contracts;
    private final RentalInvoiceRepository invoices;
    private final InvoiceNotificationRepository notifications;

    @Transactional
    public synchronized void seedHistoricalInvoices() {
        List<RentalContract> fixtures = contracts.findAll().stream()
                .filter(c -> c.isLocalFixture() && c.getStatus() == RentalContract.Status.ACTIVE)
                .toList();

        if (fixtures.isEmpty()) {
            log.info("[LocalInvoiceFixture] No local-fixture ACTIVE contracts found — skipping invoice seed.");
            return;
        }

        YearMonth current = YearMonth.now();

        for (RentalContract c : fixtures) {
            YearMonth start = YearMonth.from(c.getStartDate());

            // Seed months from contract start up to (but not including) current month
            YearMonth period = start;
            BigDecimal elecReading = c.getElectricityBaseline() != null ? c.getElectricityBaseline() : BigDecimal.ZERO;
            BigDecimal waterReading = c.getWaterBaseline() != null ? c.getWaterBaseline() : BigDecimal.ZERO;

            // Advance readings to account for months before the seeding window
            // (here start == contract start, so no pre-advance needed)

            while (period.isBefore(current)) {
                String periodStr = period.toString();

                if (invoices.existsByContractIdAndPeriod(c.getId(), periodStr)) {
                    // Already seeded — advance the meter readings to stay in sync
                    elecReading = elecReading.add(new BigDecimal("50"));
                    waterReading = waterReading.add(new BigDecimal("10"));
                    period = period.plusMonths(1);
                    continue;
                }

                BigDecimal elecEnd = elecReading.add(new BigDecimal("50"));
                BigDecimal waterEnd = waterReading.add(new BigDecimal("10"));

                BigDecimal elecQty = elecEnd.subtract(elecReading);
                BigDecimal waterQty = waterEnd.subtract(waterReading);

                BigDecimal elecUnit = c.getElectricityUnitPrice() != null ? c.getElectricityUnitPrice() : new BigDecimal("3500");
                BigDecimal waterUnit = c.getWaterUnitPrice() != null ? c.getWaterUnitPrice() : new BigDecimal("15000");

                BigDecimal elecAmount = elecQty.multiply(elecUnit);
                BigDecimal waterAmount = waterQty.multiply(waterUnit);
                BigDecimal total = c.getMonthlyRent().add(elecAmount).add(waterAmount);

                LocalDate dueDate = period.atDay(15);
                Instant sentAt = period.atDay(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();

                RentalInvoice inv = new RentalInvoice();
                inv.setContract(c);
                inv.setPeriod(periodStr);
                inv.setDueDate(dueDate);
                inv.setMonthlyRent(c.getMonthlyRent());
                inv.setElectricityStartReading(elecReading);
                inv.setElectricityEndReading(elecEnd);
                inv.setElectricityQuantity(elecQty);
                inv.setElectricityUnitPrice(elecUnit);
                inv.setElectricityAmount(elecAmount);
                inv.setWaterStartReading(waterReading);
                inv.setWaterEndReading(waterEnd);
                inv.setWaterQuantity(waterQty);
                inv.setWaterUnitPrice(waterUnit);
                inv.setWaterAmount(waterAmount);
                inv.setTotalAmount(total);
                inv.setStatus(RentalInvoice.Status.SENT);
                inv.setCreatedAt(sentAt);
                inv.setSentAt(sentAt);

                RentalInvoice saved = invoices.save(inv);

                // Create InvoiceNotification for the tenant
                AuthAccount tenant = c.getCustomer();
                if (tenant != null) {
                    InvoiceNotification notif = new InvoiceNotification();
                    notif.setInvoice(saved);
                    notif.setCustomer(tenant);
                    notif.setCreatedAt(sentAt);
                    notifications.save(notif);
                }

                log.info("[LocalInvoiceFixture] Seeded invoice period={} contractId={} total={}",
                        periodStr, c.getId(), total);

                elecReading = elecEnd;
                waterReading = waterEnd;
                period = period.plusMonths(1);
            }
        }

        log.info("[LocalInvoiceFixture] Historical invoice seeding complete.");
    }
}

