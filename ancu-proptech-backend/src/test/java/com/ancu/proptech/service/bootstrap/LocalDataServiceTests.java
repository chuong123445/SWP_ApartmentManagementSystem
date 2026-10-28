package com.ancu.proptech.service.bootstrap;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
class LocalDataServiceTests {
    @Test void existingDatasetIsNeverChangedEvenWhenOtherTablesAreEmpty() {
        var accounts = mock(AuthAccountRepository.class); var properties = mock(PropertyRepository.class);
        var apartments = mock(ApartmentRepository.class); var requests = mock(RentalRequestRepository.class); var passwords = mock(PasswordEncoder.class);
        when(properties.count()).thenReturn(1L);
        assertFalse(new LocalDataService(accounts, properties, apartments, requests, passwords).initializeIfEmpty("", "", "", ""));
        verifyNoInteractions(accounts, apartments, requests, passwords);
        verify(properties, never()).save(any());
    }
    @Test void emptyDatasetSeedsOnceWithoutReplacingExistingOwnerCredentials() {
        var accounts = mock(AuthAccountRepository.class); var properties = mock(PropertyRepository.class);
        var apartments = mock(ApartmentRepository.class); var requests = mock(RentalRequestRepository.class); var passwords = mock(PasswordEncoder.class);
        var owner = new AuthAccount(); owner.setRole(AuthAccount.Role.OWNER); owner.setStatus(AuthAccount.Status.ACTIVE); owner.setContactVerified(true);owner.setEmailVerified(true); owner.setPasswordHash("unchanged-hash");
        when(accounts.findByEmail("owner@example.invalid")).thenReturn(Optional.of(owner));
        when(properties.save(any())).thenAnswer(call -> call.getArgument(0));
        when(accounts.save(any())).thenAnswer(call -> call.getArgument(0));
        when(properties.count()).thenReturn(0L, 2L);
        var service = new LocalDataService(accounts, properties, apartments, requests, passwords);
        assertTrue(service.initializeIfEmpty("owner@example.invalid", "unused-password", "customer@example.invalid", "customer-test-password"));
        assertFalse(service.initializeIfEmpty("owner@example.invalid", "unused-password", "customer@example.invalid", "customer-test-password"));
        verify(properties, times(2)).save(any()); verify(apartments, times(8)).save(any());
        verify(accounts, never()).save(owner); assertEquals("unchanged-hash", owner.getPasswordHash());
    }
}
