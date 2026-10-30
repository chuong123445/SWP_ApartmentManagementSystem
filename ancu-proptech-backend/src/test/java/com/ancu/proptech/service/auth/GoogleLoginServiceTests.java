package com.ancu.proptech.service.auth;

import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleLoginServiceTests {
    private final AuthAccountRepository accounts = mock(AuthAccountRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final AuthService auth = mock(AuthService.class);
    private final JwtDecoder decoder = mock(JwtDecoder.class);

    private GoogleLoginService service(String clientId) {
        var service = new GoogleLoginService(accounts, passwords, auth, clientId);
        ReflectionTestUtils.setField(service, "decoder", decoder);
        return service;
    }

    private void token() {
        when(decoder.decode("credential")).thenReturn(Jwt.withTokenValue("credential")
                .header("alg", "RS256").subject("google-user-123")
                .claim("email", "New@Gmail.com").claim("name", "Google User").build());
    }

    @Test void disabledConfigurationRejectsBeforeDecoding() {
        assertThrows(AuthException.class, () -> service("").login("credential"));
        verifyNoInteractions(decoder, accounts, auth);
    }

    @Test void invalidTokenCannotCreateSession() {
        when(decoder.decode("bad")).thenThrow(new BadJwtException("invalid signature"));
        assertThrows(AuthException.class, () -> service("client").login("bad"));
        verifyNoInteractions(accounts, auth);
    }

    @Test void newGoogleAccountHasOnlyCustomerRoleAndVerifiedEmail() {
        token();
        when(passwords.encode(anyString())).thenReturn("random-password-hash");
        service("client").login("credential");
        var captor = org.mockito.ArgumentCaptor.forClass(AuthAccount.class);
        verify(accounts).saveAndFlush(captor.capture());
        var account = captor.getValue();
        assertEquals("new@gmail.com", account.getEmail());
        assertEquals("google-user-123", account.getGoogleSubject());
        assertEquals(AuthAccount.Role.CUSTOMER, account.getRole());
        assertTrue(account.isEmailVerified());
        assertTrue(account.isContactVerified());
        assertEquals(AuthAccount.Status.ACTIVE, account.getStatus());
        verify(auth).googleLogin(account);
    }

    @Test void existingPasswordAccountIsNeverAutomaticallyLinked() {
        token();
        when(accounts.findByEmail("new@gmail.com")).thenReturn(Optional.of(new AuthAccount()));
        assertThrows(AuthException.class, () -> service("client").login("credential"));
        verify(accounts, never()).saveAndFlush(any());
        verifyNoInteractions(auth);
    }

    @Test void returningGoogleUserIsFoundBySubjectEvenIfEmailChanges() {
        token();
        var account = new AuthAccount();
        when(accounts.findByGoogleSubject("google-user-123")).thenReturn(Optional.of(account));
        service("client").login("credential");
        verify(accounts, never()).findByEmail(any());
        verify(auth).googleLogin(account);
    }
}
