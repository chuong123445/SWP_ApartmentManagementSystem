package com.ancu.proptech.service.auth;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
@Service @RequiredArgsConstructor
public class AccountAccessService {
    private final AccountVerificationPolicy verification;
    private final AuthService auth;
    public AuthAccount account(Jwt jwt) { return auth.authenticate(jwt); }
    public AuthAccount customer(Jwt jwt) { return require(jwt, AuthAccount.Role.CUSTOMER); }
    public AuthAccount owner(Jwt jwt) { return require(jwt, AuthAccount.Role.OWNER); }
    public AuthAccount admin(Jwt jwt) {
        AuthAccount account = auth.authenticate(jwt);
        if (account.getRole() != AuthAccount.Role.ADMIN || account.getStatus() != AuthAccount.Status.ACTIVE)
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ Admin đang hoạt động được kiểm duyệt hồ sơ tài sản.");
        return account;
    }
    private AuthAccount require(Jwt jwt, AuthAccount.Role role) {
        AuthAccount account = auth.authenticate(jwt);
        boolean ordinaryAccount = role == AuthAccount.Role.CUSTOMER && account.getRole() == AuthAccount.Role.OWNER;
        if (account.getRole() != role && !ordinaryAccount) throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Tài khoản không có quyền thực hiện thao tác này.");
        if (account.getStatus() != AuthAccount.Status.ACTIVE || !verification.isVerified(account))
            throw new ApiException(HttpStatus.FORBIDDEN, "CONTACT_NOT_VERIFIED", "Cần xác minh email hoặc số điện thoại để thực hiện thao tác này.");
        return account;
    }
}
