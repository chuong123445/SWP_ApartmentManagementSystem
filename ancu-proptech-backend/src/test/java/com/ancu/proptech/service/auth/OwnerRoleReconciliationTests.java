package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OwnerRoleReconciliationTests {
    @Mock PropertyRepository properties;
    @Mock AuthAccountRepository accounts;
    @InjectMocks OwnerRoleReconciliationService reconciler;

    @Test
    void demotesOwnerToCustomerWhenNoApprovedProperties() {
        AuthAccount account = new AuthAccount();
        account.setId(31L);
        account.setEmail("tranthithuha@example.com");
        account.setRole(AuthAccount.Role.OWNER);

        when(properties.existsByOwnerIdAndApprovalStatus(31L, Property.ApprovalStatus.APPROVED)).thenReturn(false);

        boolean changed = reconciler.reconcile(account);

        assertTrue(changed);
        assertEquals(AuthAccount.Role.CUSTOMER, account.getRole());
        assertFalse(account.hasRole(AuthAccount.Role.OWNER));
        assertTrue(account.hasRole(AuthAccount.Role.CUSTOMER));
        verify(accounts).save(account);
        verify(accounts).flush();
    }

    @Test
    void retainsOwnerWhenApprovedPropertiesExist() {
        AuthAccount account = new AuthAccount();
        account.setId(31L);
        account.setEmail("tranthithuha@example.com");
        account.setRole(AuthAccount.Role.OWNER);

        when(properties.existsByOwnerIdAndApprovalStatus(31L, Property.ApprovalStatus.APPROVED)).thenReturn(true);

        boolean changed = reconciler.reconcile(account);

        assertFalse(changed);
        assertEquals(AuthAccount.Role.OWNER, account.getRole());
        assertTrue(account.hasRole(AuthAccount.Role.OWNER));
        verifyNoInteractions(accounts);
    }

    @Test
    void doesNotDemoteAdmin() {
        AuthAccount account = new AuthAccount();
        account.setId(9L);
        account.setEmail("admin@ancu.local");
        account.setRole(AuthAccount.Role.ADMIN);

        boolean changed = reconciler.reconcile(account);

        assertFalse(changed);
        assertEquals(AuthAccount.Role.ADMIN, account.getRole());
        assertTrue(account.hasRole(AuthAccount.Role.ADMIN));
        verifyNoInteractions(accounts);
    }

    @Test
    void doesNothingForCustomerWithoutOwnerRole() {
        AuthAccount account = new AuthAccount();
        account.setId(1L);
        account.setEmail("customer@ancu.local");
        account.setRole(AuthAccount.Role.CUSTOMER);

        boolean changed = reconciler.reconcile(account);

        assertFalse(changed);
        assertEquals(AuthAccount.Role.CUSTOMER, account.getRole());
        verifyNoInteractions(accounts);
    }
}
