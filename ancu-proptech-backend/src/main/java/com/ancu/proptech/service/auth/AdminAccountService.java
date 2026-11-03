package com.ancu.proptech.service.auth;

import com.ancu.proptech.dto.auth.AdminAccountDtos.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AccountAdministrationRepository;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.service.apartment.ApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminAccountService {
    private final AccountAccessService access;
    private final AuthAccountRepository accounts;
    private final AccountAdministrationRepository administration;

    @Transactional(readOnly = true)
    public PageResponse<Account> list(Jwt jwt, String search, Filter filter, int page, int size) {
        Long admin = access.admin(jwt).getId();
        ApartmentService.validatePage(page, size);
        String query = search == null ? "" : search.strip().toLowerCase(Locale.ROOT);
        if (query.length() > 120) throw error(HttpStatus.BAD_REQUEST, "INVALID_SEARCH", "Từ khóa tối đa 120 ký tự.");
        var status = filter == Filter.ALL || filter == Filter.DELETED ? null : AuthAccount.Status.valueOf(filter.name());
        return PageResponse.from(accounts.searchForAdmin("%" + query + "%", status, filter == Filter.DELETED,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"))).map(a -> view(a, admin)));
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Result command(Jwt jwt, Long id, Command input) {
        Long admin = access.admin(jwt).getId();
        var account = accounts.findForIdentityUpdate(id).orElseThrow(() ->
                error(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy tài khoản."));
        if (id.equals(admin) || account.getRole() == AuthAccount.Role.ADMIN) {
            throw error(HttpStatus.FORBIDDEN, "ADMIN_ACCOUNT_PROTECTED", "Chức năng này chỉ quản lý tài khoản Owner và Customer.");
        }
        if (account.getDeletedAt() != null) throw conflict("ACCOUNT_DELETED", "Tài khoản đã được xóa.");
        if (account.getVersion() != input.version()) throw conflict("STALE_VERSION", "Tài khoản đã thay đổi. Vui lòng tải lại.");
        String reason = input.reason().strip();
        if (reason.isEmpty()) throw error(HttpStatus.BAD_REQUEST, "REASON_REQUIRED", "Nhập lý do thực hiện thao tác.");

        String outcome;
        switch (input.action()) {
            case LOCK -> {
                if (account.getStatus() != AuthAccount.Status.ACTIVE
                        && account.getStatus() != AuthAccount.Status.PENDING_VERIFICATION) {
                    throw conflict("ACCOUNT_STATUS_CHANGED", "Chỉ khóa tài khoản đang hoạt động hoặc đang chờ xác thực.");
                }
                account.setLockedFromStatus(account.getStatus());
                account.setStatus(AuthAccount.Status.LOCKED);
                outcome = "LOCKED";
            }
            case UNLOCK -> {
                if (account.getStatus() != AuthAccount.Status.LOCKED || account.getLockedFromStatus() == null) {
                    throw conflict("ACCOUNT_STATUS_CHANGED", "Không có trạng thái trước khi khóa để khôi phục.");
                }
                account.setStatus(account.getLockedFromStatus());
                account.setLockedFromStatus(null);
                outcome = "UNLOCKED";
            }
            case DELETE -> {
                if (administration.hasBusinessHistory(id)) {
                    account.setDeletedAt(Instant.now());
                    account.setStatus(AuthAccount.Status.INACTIVE);
                    account.setLockedFromStatus(null);
                    outcome = "SOFT_DELETED";
                } else {
                    // The SERIALIZABLE reference probes retain range locks until the deletion commits.
                    accounts.flush();
                    administration.deleteTechnicalArtifacts(id);
                    administration.audit(admin, id, account.getEmail(), "HARD_DELETED", reason);
                    administration.deleteBlankAccount(id);
                    return new Result(id.toString(), "HARD_DELETED");
                }
            }
            default -> throw new IllegalArgumentException("Unsupported account action");
        }
        accounts.flush();
        administration.revokeSessions(id);
        administration.audit(admin, id, account.getEmail(), outcome, reason);
        return new Result(id.toString(), outcome);
    }

    private static Account view(AuthAccount account, Long admin) {
        boolean manageable = !account.getId().equals(admin) && account.getRole() != AuthAccount.Role.ADMIN && account.getDeletedAt() == null;
        return new Account(account.getId().toString(), account.getEmail(), account.getFullName(), account.getRole().name(),
                account.getStatus(), account.getDeletedAt(), account.getVersion(), manageable,
                manageable && account.getStatus() == AuthAccount.Status.LOCKED && account.getLockedFromStatus() != null);
    }

    private static ApiException conflict(String code, String message) {
        return error(HttpStatus.CONFLICT, code, message);
    }

    private static ApiException error(HttpStatus status, String code, String message) {
        return new ApiException(status, code, message);
    }
}
