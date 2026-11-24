package com.ancu.proptech.service.payment;

import com.ancu.proptech.dto.payment.CashInvoicePaymentDtos.*;
import com.ancu.proptech.dto.finance.CashDtos;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.model.finance.CashEntry;
import com.ancu.proptech.model.payment.InvoicePayment;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.repository.finance.CashEntryRepository;
import com.ancu.proptech.repository.payment.InvoicePaymentRepository;
import com.ancu.proptech.repository.payment.SepayEventRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.finance.CashEntryService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class CashInvoicePaymentService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final AccountAccessService access;
    private final RentalInvoiceRepository invoices;
    private final RentalContractRepository contracts;
    private final InvoicePaymentRepository payments;
    private final SepayEventRepository events;
    private final CashEntryRepository entries;
    private final CashEntryService cash;
    private final EntityManager entities;
    private final Clock clock;

    @Transactional
    public Receipt confirm(Jwt jwt, Long id, Confirm input) {
        var owner = access.owner(jwt);
        var invoice = invoices.findWithContractById(id).filter(i -> i.getContract().getApartment()
            .getProperty().getOwner().getId().equals(owner.getId())).orElseThrow(CashInvoicePaymentService::missing);
        // Cùng khóa với gửi/hủy hóa đơn và webhook để không xác nhận tiền hai lần.
        contracts.lockById(invoice.getContract().getId()).orElseThrow(CashInvoicePaymentService::missing);
        entities.refresh(invoice);
        if (invoice.getStatus() != RentalInvoice.Status.SENT)
            throw conflict("Chỉ xác nhận tiền mặt cho hóa đơn đã gửi.");
        var payment = payments.findByInvoiceId(id).orElse(null);
        if (payment != null) entities.refresh(payment);
        if (payment != null && payment.getPaidAt() != null) {
            if (payment.getPaymentMethod() != InvoicePayment.Method.CASH)
                throw conflict("Hóa đơn đã thanh toán bằng chuyển khoản, không ghi thu tiền mặt lần nữa.");
            return receipt(payment, entries.findBySourceInvoiceId(id).orElseThrow(CashInvoicePaymentService::missing));
        }
        if (invoice.getVersion() != input.version()) throw conflict("Hóa đơn đã thay đổi. Hãy tải lại trước khi xác nhận.");
        if (events.existsByInvoiceIdAndResultInAndAmountGreaterThan(id,
            Set.of("MATCHED", "ALREADY_PAID", "AMOUNT_MISMATCH", "INVOICE_NOT_SENT"), java.math.BigDecimal.ZERO))
            throw conflict("Đã ghi nhận tiền chuyển đến. Cần đối soát trước khi xác nhận thu đủ bằng tiền mặt.");
        var now = clock.instant();
        var today = now.atZone(ZONE).toLocalDate();
        if (input.transactionDate().isAfter(today) || input.transactionDate().getYear() < 1900
            || invoice.getSentAt() == null || input.transactionDate().isBefore(invoice.getSentAt().atZone(ZONE).toLocalDate()))
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CASH_DATE", "Ngày nhận tiền phải từ ngày gửi hóa đơn đến hôm nay.");
        java.math.BigDecimal amount;
        try {
            amount = invoice.getTotalAmount().setScale(2, RoundingMode.UNNECESSARY);
            if (amount.signum() <= 0 || amount.precision() - amount.scale() > 13) throw new ArithmeticException();
        } catch (ArithmeticException ex) {
            throw conflict("Số tiền hóa đơn vượt giới hạn phiếu thu hoặc có phần lẻ không hợp lệ.");
        }
        if (payment == null) {
            payment = new InvoicePayment();payment.setInvoiceId(id);payment.setOwnerId(owner.getId());
            payment.setPaymentCode("ANCU" + UUID.randomUUID().toString().replace("-", "").substring(0, 24).toUpperCase(java.util.Locale.ROOT));
        }
        payment.setAmount(amount);payment.setPaymentMethod(InvoicePayment.Method.CASH);
        payment.setConfirmedBy(owner.getId());payment.setConfirmationNote(input.note() == null ? null : input.note().strip());
        payment.setPaidAt(input.transactionDate().equals(today) ? now : input.transactionDate().atStartOfDay(ZONE).toInstant());
        payments.saveAndFlush(payment);
        var property = invoice.getContract().getApartment().getProperty();
        String reference = "INVOICE:" + id;
        var draft = cash.create(jwt, new CashDtos.Create(property.getId(),
            UUID.nameUUIDFromBytes(reference.getBytes(StandardCharsets.UTF_8)).toString(),
            CashEntry.Direction.INCOME, CashEntry.Method.CASH, amount, input.transactionDate(),
            "Thu tiền hóa đơn", invoice.getContract().getCustomer().getFullName(),
            "Nhận đủ tiền mặt hóa đơn #" + id + " · kỳ " + invoice.getPeriod(), reference));
        var entry = entries.findById(draft.id()).orElseThrow(CashInvoicePaymentService::missing);
        entry.setSourceInvoiceId(id);entries.flush();
        cash.post(jwt, entry.getId(), new CashDtos.Post(entry.getVersion()));
        return receipt(payment, entry);
    }
    private Receipt receipt(InvoicePayment payment, CashEntry entry) {
        return new Receipt(payment.getInvoiceId().toString(), entry.getId().toString(), payment.getAmount().toPlainString(), payment.getPaidAt());
    }
    private static ApiException missing() { return new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy hóa đơn thuộc tài khoản của bạn."); }
    private static ApiException conflict(String message) { return new ApiException(HttpStatus.CONFLICT, "CASH_PAYMENT_CONFLICT", message); }
}
