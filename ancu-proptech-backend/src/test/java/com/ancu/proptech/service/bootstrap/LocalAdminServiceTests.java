package com.ancu.proptech.service.bootstrap;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class LocalAdminServiceTests {
    @Test void emptyConfigurationDoesNothingAndInvalidConfigurationNeverCreatesAccount(){
        var accounts=mock(AuthAccountRepository.class);var passwords=mock(PasswordEncoder.class);var service=new LocalAdminService(accounts,passwords);
        service.provision("","","Admin");verifyNoInteractions(accounts,passwords);
        assertThrows(IllegalStateException.class,()->service.provision("admin@example.invalid","short","Admin"));verifyNoInteractions(accounts,passwords);
    }
    @Test void existingAdminIsPreservedAndOwnerIsNeverPromoted(){
        var accounts=mock(AuthAccountRepository.class);var passwords=mock(PasswordEncoder.class);var service=new LocalAdminService(accounts,passwords);
        var existing=new AuthAccount();existing.setRole(AuthAccount.Role.ADMIN);existing.setPasswordHash("previous-hash");existing.setStatus(AuthAccount.Status.LOCKED);
        when(accounts.findByEmail("admin@example.invalid")).thenReturn(Optional.of(existing));
        service.provision("ADMIN@example.invalid","Admin-test!12345","Admin");assertEquals("previous-hash",existing.getPasswordHash());assertEquals(AuthAccount.Status.LOCKED,existing.getStatus());verifyNoInteractions(passwords);
        existing.setRole(AuthAccount.Role.OWNER);assertThrows(IllegalStateException.class,()->service.provision("admin@example.invalid","Admin-test!12345","Admin"));verify(accounts,never()).save(any());
    }
    @Test void newAdminHasStaffRoleButNoFakeContactVerification(){
        var accounts=mock(AuthAccountRepository.class);var passwords=mock(PasswordEncoder.class);var service=new LocalAdminService(accounts,passwords);
        when(accounts.findByEmail("admin@example.invalid")).thenReturn(Optional.empty());when(passwords.encode("Admin-test!12345")).thenReturn("hash");
        service.provision("admin@example.invalid","Admin-test!12345","Admin");var capture=org.mockito.ArgumentCaptor.forClass(AuthAccount.class);verify(accounts).save(capture.capture());
        assertEquals(AuthAccount.Role.ADMIN,capture.getValue().getRole());assertEquals(AuthAccount.Status.ACTIVE,capture.getValue().getStatus());assertFalse(capture.getValue().isEmailVerified());assertFalse(capture.getValue().isContactVerified());
    }
}
