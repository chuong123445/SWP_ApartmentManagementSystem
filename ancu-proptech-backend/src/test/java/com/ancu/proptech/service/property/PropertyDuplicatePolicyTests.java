package com.ancu.proptech.service.property;

import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.property.PropertyEvidenceFile;
import com.ancu.proptech.repository.property.PropertyDuplicateRepository;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PropertyDuplicatePolicyTests {
    private final PropertyDuplicateRepository repository=mock(PropertyDuplicateRepository.class);
    private final PropertyDuplicatePolicy policy=new PropertyDuplicatePolicy(repository);

    @Test void certificateCannotBypassCheckWithCaseSpacingOrPunctuation(){
        when(repository.approvedCertificates(2L)).thenReturn(List.of("gcn - 001"));
        assertEquals("CERTIFICATE_ALREADY_APPROVED",assertThrows(ApiException.class,()->policy.check(2L," GCN/001 ",List.of())).code);
    }
    @Test void identicalOwnershipFileIsRejectedEvenWithoutCertificate(){
        var file=new PropertyEvidenceFile();file.setId(7L);file.setPurpose(PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT);
        when(repository.approvedEvidenceMatches(2L,7L)).thenReturn(true);
        assertEquals("EVIDENCE_ALREADY_APPROVED",assertThrows(ApiException.class,()->policy.check(2L,null,List.of(file))).code);
    }
    @Test void commonSupportingFileIsNotOwnershipDuplicate(){
        var file=new PropertyEvidenceFile();file.setId(7L);file.setPurpose(PropertyEvidenceFile.Purpose.SUPPORTING);
        policy.check(2L,null,List.of(file));verify(repository,never()).approvedEvidenceMatches(anyLong(),anyLong());
    }
    @Test void samePropertyIsPassedToRepositoryForExclusion(){
        when(repository.approvedCertificates(2L)).thenReturn(List.of("other"));
        policy.check(2L,"GCN001",List.of());verify(repository).approvedCertificates(2L);
    }
    @Test void failedApprovalLockStopsProcessing(){
        assertEquals("REVIEW_BUSY",assertThrows(ApiException.class,policy::lockApproval).code);
        when(repository.lockApproval()).thenReturn(true);assertDoesNotThrow(policy::lockApproval);
    }
}
