package com.ancu.proptech.service.auth;

import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service @RequiredArgsConstructor
public class RegistrationService {
    private final AuthAccountRepository accounts;
    private final PasswordEncoder passwords;
    private final AuthService auth;

    @Transactional
    public AuthUserResponse register(RegistrationRequest input) {
        String email=input.getEmail().strip().toLowerCase(Locale.ROOT);
        if(input.getPassword().getBytes(StandardCharsets.UTF_8).length>72)
            throw AccountService.error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Mật khẩu tối đa 72 byte UTF-8.");
        if(accounts.findByEmail(email).isPresent())
            throw AccountService.error(HttpStatus.CONFLICT,"CONTACT_IN_USE","Email đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.");
        var account=new AuthAccount();
        account.setEmail(email);
        account.setFullName(input.getFullName().strip());
        account.setPasswordHash(passwords.encode(input.getPassword()));
        account.setRole(AuthAccount.Role.valueOf(input.getRequestedRole().name()));
        account.setStatus(AuthAccount.Status.PENDING_VERIFICATION);
        account.setPhone(AccountService.normalizePhone(input.getPhone()));
        // Unverified registration never grants business authority or property approval.
        account.setEmailVerified(false);account.setPhoneVerified(false);account.setContactVerified(false);
        return auth.user(accounts.saveAndFlush(account));
    }
}
