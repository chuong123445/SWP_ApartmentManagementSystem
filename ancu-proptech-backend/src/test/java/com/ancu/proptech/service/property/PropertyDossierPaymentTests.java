package com.ancu.proptech.service.property;

import com.ancu.proptech.dto.property.PropertyDossierSubmit;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.property.PropertyDossier;
import com.ancu.proptech.repository.property.PropertyDossierRepository;
import com.ancu.proptech.repository.property.PropertyExternalImportRepository;
import com.ancu.proptech.repository.property.PropertySourceImportBatchRepository;
import com.ancu.proptech.repository.property.PropertySourceUnitRepository;
import com.ancu.proptech.service.contract.ContractPropertyEvidenceResolver;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PropertyDossierPaymentTests {
    @Test
    void rightsOnlySubmissionIsValidWithoutReceivingAccount() {
        var input = new PropertyDossierSubmit();
        input.setPropertyVersion(0L);
        input.setRightType(PropertyDossier.RightType.OWNERSHIP);
        input.setDocumentFileIds(List.of(7L));
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(input).isEmpty());
        }
    }

    @Test
    void newlyApprovedRightsDossierHasEvidenceWithoutAnEmptyPaymentObject() {
        var resolved = resolve(null);
        assertNull(resolved.bank());
        assertEquals("42", resolved.dossierId());
        assertEquals("GCN-001", resolved.certificate());
        assertEquals("ADMIN_APPROVED_DOSSIER", resolved.evidence().source());
        assertEquals(64, resolved.evidence().sourceHash().length());
    }

    @Test
    void historicalApprovedDossierKeepsItsReceivingAccount() {
        var resolved = resolve("Saved bank");
        assertEquals("Saved bank", resolved.bank().bank());
        assertEquals("12345678", resolved.bank().accountNumber());
        assertEquals("Saved owner", resolved.bank().accountHolderName());
    }

    private ContractPropertyEvidenceResolver.Resolved resolve(String bank) {
        var property = new Property();
        property.setId(1L);
        var dossier = new PropertyDossier();
        dossier.setId(42L);
        dossier.setProperty(property);
        dossier.setRightType(PropertyDossier.RightType.OWNERSHIP);
        dossier.setCertificateNumber("GCN-001");
        dossier.setStatus(PropertyDossier.Status.APPROVED);
        dossier.setSubmittedAt(Instant.parse("2026-01-01T00:00:00Z"));
        if (bank != null) {
            dossier.setBank(bank);
            dossier.setAccountNumber("12345678");
            dossier.setAccountHolderName("Saved owner");
        }
        var dossiers = mock(PropertyDossierRepository.class);
        when(dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(property.getId())).thenReturn(List.of(dossier));
        var resolver = new ContractPropertyEvidenceResolver(mock(PropertyExternalImportRepository.class), dossiers,
            new ObjectMapper(), mock(PropertySourceUnitRepository.class), mock(PropertySourceImportBatchRepository.class));
        return resolver.resolve(property);
    }
}
