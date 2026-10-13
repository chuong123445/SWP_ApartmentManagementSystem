package com.ancu.proptech.service.bootstrap;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
@Service @Profile("local") @RequiredArgsConstructor
public class LocalAdminService {
    private final AuthAccountRepository accounts;
    private final PasswordEncoder passwords;
    // Opt-in local provisioning; never a public registration or existing-account promotion.
    @Transactional public synchronized void provision(String email,String password,String name){
        if(email.isBlank()&&password.isBlank())return;
        String normalized=email.strip().toLowerCase(Locale.ROOT);
        if(normalized.length()>254||!normalized.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")||password.length()<12||password.getBytes(StandardCharsets.UTF_8).length>72||name.isBlank()||name.strip().length()>100)
            throw new IllegalStateException("Configure valid LOCAL_ADMIN_EMAIL/LOCAL_ADMIN_PASSWORD/LOCAL_ADMIN_NAME for local Admin provisioning.");
        var existing=accounts.findByEmail(normalized);
        if(existing.isPresent()){
            if(existing.get().getRole()!=AuthAccount.Role.ADMIN)throw new IllegalStateException("Configured local Admin email belongs to a non-Admin account; no account was promoted.");
            return;
        }
        var admin=new AuthAccount();admin.setEmail(normalized);admin.setPasswordHash(passwords.encode(password));admin.setFullName(name.strip());
        admin.setRole(AuthAccount.Role.ADMIN);admin.setStatus(AuthAccount.Status.ACTIVE);
        // Server-provisioned staff access; email OTP has not been proven and is not claimed.
        admin.setEmailVerified(false);admin.setPhoneVerified(false);admin.setContactVerified(false);accounts.save(admin);
    }
}
