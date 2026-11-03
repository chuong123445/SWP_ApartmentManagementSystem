package com.ancu.proptech.service.payment;

import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.payment.SettlementDtos.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.payment.OwnerWithdrawal;
import com.ancu.proptech.model.payment.OwnerWithdrawal.Status;
import com.ancu.proptech.model.payment.SettlementEntry;
import com.ancu.proptech.model.payment.SettlementEntry.Kind;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.payment.OwnerWithdrawalRepository;
import com.ancu.proptech.repository.payment.SettlementEntryRepository;
import com.ancu.proptech.service.apartment.ApartmentService;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.property.OwnerPaymentQrService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SettlementService {
    private final AccountAccessService access;
    private final AuthAccountRepository accounts;
    private final SettlementEntryRepository entries;
    private final OwnerWithdrawalRepository withdrawals;
    private final OwnerPaymentQrService paymentQrs;

    private Destination destination(Jwt jwt) {
        var qr = paymentQrs.current(jwt);
        return qr == null ? null : new Destination(qr.id(), qr.bank(), qr.accountNumber(), qr.accountHolderName());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void credit(Long ownerId, Kind kind, Long sourceId, BigDecimal amount) {
        lockOwner(ownerId);
        entries.save(new SettlementEntry(ownerId, kind, sourceId, amount));
    }

    @Transactional(readOnly = true)
    public Wallet wallet(Jwt jwt) {
        Long owner = access.owner(jwt).getId();
        var balance = balance(owner);
        var history = entries.findTop50ByOwnerIdOrderByIdDesc(owner).stream()
                .map(e -> new Entry(e.getId().toString(), e.getKind(), e.getSourceId().toString(),
                        money(e.getAmount()), e.getCreatedAt())).toList();
        return new Wallet(money(balance.received()), money(balance.available()),
                money(balance.reserved()), money(balance.paid()), history, destination(jwt));
    }

    @Transactional(readOnly = true)
    public PageResponse<Withdrawal> ownWithdrawals(Jwt jwt, int page, int size) {
        Long owner = access.owner(jwt).getId();
        return PageResponse.from(withdrawals.findByOwnerId(owner, page(page, size)).map(w -> view(w, null)));
    }

    @Transactional(readOnly = true)
    public PageResponse<Withdrawal> adminWithdrawals(Jwt jwt, Status status, int page, int size) {
        Long admin = access.admin(jwt).getId();
        var pageable = page(page, size);
        var result = status == null ? withdrawals.findAll(pageable) : withdrawals.findByStatus(status, pageable);
        return PageResponse.from(result.map(w -> view(w, admin)));
    }

    @Transactional(readOnly = true)
    public byte[] withdrawalQr(Jwt jwt, Long id) {
        Long admin = access.admin(jwt).getId();
        var withdrawal = withdrawals.findById(id).orElseThrow(SettlementService::missing);
        requireProcessingAdmin(withdrawal, admin);
        return WithdrawalPaymentQr.png(withdrawal);
    }

    @Transactional
    public Withdrawal request(Jwt jwt, Request input) {
        Long owner = access.owner(jwt).getId();
        lockOwner(owner);
        String key = input.requestKey().toString();
        var previous = withdrawals.findByOwnerIdAndRequestKey(owner, key).orElse(null);
        if (previous != null) {
            if (previous.getAmount().compareTo(input.amount()) != 0) {
                throw conflict("WITHDRAWAL_REQUEST_CHANGED", "Mã yêu cầu đã được dùng với thông tin khác.");
            }
            return view(previous, null);
        }
        var destination = destination(jwt);
        if (destination == null) {
            throw conflict("WITHDRAWAL_DESTINATION_REQUIRED", "Hãy xác nhận QR nhận tiền chung trong Cài đặt đơn giá.");
        }
        if (!destination.qrId().equals(input.qrId().toString())) {
            throw conflict("WITHDRAWAL_DESTINATION_CHANGED", "Tài khoản nhận tiền đã thay đổi. Kiểm tra lại trước khi gửi.");
        }
        if (balance(owner).available().compareTo(input.amount()) < 0) {
            throw conflict("INSUFFICIENT_SETTLEMENT_BALANCE", "Số tiền yêu cầu vượt quá số dư có thể rút.");
        }
        var w = new OwnerWithdrawal();
        w.setOwnerId(owner);
        w.setRequestKey(key);
        w.setAmount(input.amount());
        w.setBank(destination.bank());
        w.setAccountNumber(destination.accountNumber());
        w.setAccountHolder(destination.accountHolder());
        w.setStatus(Status.PENDING);
        w.setCreatedAt(Instant.now());
        w.setUpdatedAt(w.getCreatedAt());
        withdrawals.saveAndFlush(w);
        entries.save(new SettlementEntry(owner, Kind.RESERVE, w.getId(), w.getAmount()));
        return view(w, null);
    }

    @Transactional
    public Withdrawal decide(Jwt jwt, Long id, Decision input, boolean adminRoute) {
        Long actor = (adminRoute ? access.admin(jwt) : access.owner(jwt)).getId();
        // Read only the owner ID before locking. Load the entity after taking the same lock as credits and requests.
        Long owner = withdrawals.findOwnerId(id).orElseThrow(SettlementService::missing);
        if (!adminRoute && !actor.equals(owner)) throw missing();
        lockOwner(owner);
        var w = withdrawals.findById(id).orElseThrow(SettlementService::missing);
        if (w.getVersion() != input.version()) throw conflict("STALE_VERSION", "Yêu cầu đã thay đổi. Vui lòng tải lại.");
        if (!adminRoute && input.action() != Action.CANCEL || adminRoute && input.action() == Action.CANCEL) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
        }
        String note = input.note() == null ? "" : input.note().strip();
        switch (input.action()) {
            case START -> {
                requireStatus(w, Status.PENDING);
                w.setStatus(Status.PROCESSING);
                w.setProcessingAdminId(actor);
            }
            case PAID -> {
                requireProcessingAdmin(w, actor);
                String ref = input.transferReference() == null ? "" : input.transferReference().strip().toUpperCase(Locale.ROOT);
                if (!ref.matches("[A-Z0-9][A-Z0-9._/-]{0,99}")) throw bad("Nhập mã giao dịch ngân hàng hợp lệ.");
                if (withdrawals.existsByTransferReference(ref)) throw duplicateReference();
                w.setTransferReference(ref);
                w.setStatus(Status.PAID);
                entries.save(new SettlementEntry(owner, Kind.PAYOUT, id, w.getAmount()));
            }
            case REJECT -> {
                if (w.getStatus() != Status.PENDING) requireProcessingAdmin(w, actor);
                if (note.isBlank()) throw bad("Nhập lý do từ chối hoặc xác nhận giao dịch chưa được chuyển.");
                w.setStatus(Status.REJECTED);
                entries.save(new SettlementEntry(owner, Kind.RELEASE, id, w.getAmount()));
            }
            case CANCEL -> {
                requireStatus(w, Status.PENDING);
                w.setStatus(Status.CANCELLED);
                entries.save(new SettlementEntry(owner, Kind.RELEASE, id, w.getAmount()));
            }
        }
        w.setNote(note.isBlank() ? null : note);
        w.setHandledById(actor);
        w.setUpdatedAt(Instant.now());
        try {
            withdrawals.flush();
        } catch (DataIntegrityViolationException error) {
            if (input.action() == Action.PAID) throw duplicateReference();
            throw error;
        }
        return view(w, adminRoute ? actor : null);
    }

    private void lockOwner(Long owner) {
        accounts.findForIdentityUpdate(owner).orElseThrow(SettlementService::missing);
    }

    private Balance balance(Long owner) {
        var totals = new EnumMap<Kind, BigDecimal>(Kind.class);
        entries.totals(owner).forEach(t -> totals.put(t.getKind(), t.getTotal()));
        var received = total(totals, Kind.INVOICE).add(total(totals, Kind.ADDITIONAL_RECEIPT));
        var held = total(totals, Kind.RESERVE).subtract(total(totals, Kind.RELEASE));
        var paid = total(totals, Kind.PAYOUT);
        return new Balance(received, received.subtract(held), held.subtract(paid), paid);
    }

    private static BigDecimal total(EnumMap<Kind, BigDecimal> totals, Kind kind) {
        return totals.getOrDefault(kind, BigDecimal.ZERO);
    }

    private record Balance(BigDecimal received, BigDecimal available, BigDecimal reserved, BigDecimal paid) {}

    private static String money(BigDecimal amount) {
        return amount.toBigIntegerExact().toString();
    }

    private static PageRequest page(int page, int size) {
        ApartmentService.validatePage(page, size);
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
    }

    private static Withdrawal view(OwnerWithdrawal w, Long admin) {
        return new Withdrawal(w.getId().toString(), w.getOwnerId().toString(), money(w.getAmount()),
                w.getBank(), w.getAccountNumber(), w.getAccountHolder(), w.getStatus(),
                w.getTransferReference(), w.getNote(), w.getCreatedAt(), w.getUpdatedAt(), w.getVersion(),
                admin != null && w.getStatus() == Status.PROCESSING && admin.equals(w.getProcessingAdminId()));
    }

    private static void requireStatus(OwnerWithdrawal w, Status status) {
        if (w.getStatus() != status) throw conflict("WITHDRAWAL_STATUS_CHANGED", "Yêu cầu không còn ở trạng thái phù hợp.");
    }

    private static void requireProcessingAdmin(OwnerWithdrawal w, Long actor) {
        requireStatus(w, Status.PROCESSING);
        if (!actor.equals(w.getProcessingAdminId())) {
            throw conflict("WITHDRAWAL_ASSIGNED", "Yêu cầu đang do quản trị viên khác xử lý.");
        }
    }

    private static ApiException duplicateReference() {
        return conflict("DUPLICATE_TRANSFER_REFERENCE", "Mã giao dịch ngân hàng đã được ghi nhận.");
    }

    private static ApiException missing() {
        return new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy yêu cầu rút tiền.");
    }

    private static ApiException bad(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WITHDRAWAL", message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
