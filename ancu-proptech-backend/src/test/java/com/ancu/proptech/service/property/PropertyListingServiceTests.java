package com.ancu.proptech.service.property;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.ancu.proptech.dto.property.PropertyListingDtos.*;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.exception.common.ApiException;
import org.junit.jupiter.api.*;
import tools.jackson.databind.json.JsonMapper;
import java.util.*;
class PropertyListingServiceTests {
    private final PropertyApplicantAccess access=mock(PropertyApplicantAccess.class);
    private final PropertyRepository properties=mock(PropertyRepository.class);
    private final PropertyListingDraftRepository drafts=mock(PropertyListingDraftRepository.class);
    private final PropertyEvidenceFileRepository files=mock(PropertyEvidenceFileRepository.class);
    private final AuthAccountRepository accounts=mock(AuthAccountRepository.class);
    private final OwnerPropertyService creation=mock(OwnerPropertyService.class);
    private final PropertyDossierService dossiers=mock(PropertyDossierService.class);
    private final JsonMapper json=JsonMapper.builder().build();
    private final PropertyListingService service=new PropertyListingService(access,accounts,properties,drafts,files,creation,dossiers,json);
    private final Property p=new Property();private final PropertyListingDraft d=new PropertyListingDraft();
    @BeforeEach void setup(){var a=new AuthAccount();a.setId(1L);p.setId(2L);p.setOwner(a);p.setApprovalStatus(Property.ApprovalStatus.DRAFT);p.setRightType(PropertyDossier.RightType.AUTHORIZATION);
        d.setPropertyId(2L);d.setAccountId(1L);d.setPayload("{}");d.setVersion(3);
        when(access.read(null,2L)).thenReturn(p);when(access.write(null,2L)).thenReturn(p);when(access.verified(null)).thenReturn(a);
        when(drafts.findById(2L)).thenReturn(Optional.of(d));when(properties.findById(2L)).thenReturn(Optional.of(p));when(files.findByPropertyIdOrderByIdAsc(2L)).thenReturn(List.of());
    }
    @Test void staleDraftCannotOverwrite(){assertEquals("STALE_VERSION",assertThrows(ApiException.class,()->service.save(null,2L,new Save(2L,json.createObjectNode()))).code);assertEquals("{}",d.getPayload());}
    @Test void crossAccountDraftIsNotReadable(){d.setAccountId(9L);assertEquals("RESOURCE_NOT_FOUND",assertThrows(ApiException.class,()->service.get(null,2L)).code);}
    @Test void savesPrivateStateWithoutCreatingUnits(){var result=service.save(null,2L,new Save(3L,json.readTree("{\"step\":2,\"name\":\"Nhà A\"}")));assertEquals("Nhà A",result.payload().path("name").asString());verifyNoInteractions(creation,dossiers);}
    @Test void finalizationChecksRightAndNeverApproves(){var dossier=new PropertyDossierSubmit();dossier.setRightType(PropertyDossier.RightType.AUTHORIZATION);dossier.setPropertyVersion(0L);
        service.finish(null,2L,new Finish(3L,new OwnerPropertyCreate(),dossier,true));verify(creation).completeListing(eq(null),eq(p),any());verify(dossiers).submit(null,2L,dossier);assertTrue(d.isCompleted());assertNotEquals(Property.ApprovalStatus.APPROVED,p.getApprovalStatus());}
    @Test void repeatedCompletionDoesNotDuplicate(){d.setCompleted(true);service.finish(null,2L,new Finish(0L,new OwnerPropertyCreate(),new PropertyDossierSubmit(),true));verifyNoInteractions(creation,dossiers);}
    @Test void rejectedPropertyCannotBeRewrittenByOldWizard(){p.setApprovalStatus(Property.ApprovalStatus.REJECTED);assertThrows(ApiException.class,()->service.save(null,2L,new Save(3L,json.createObjectNode())));}
    @Test void idempotencyKeyIsScopedToActor(){String key=UUID.randomUUID().toString();when(accounts.findForIdentityUpdate(1L)).thenReturn(Optional.of(p.getOwner()));when(drafts.findByRequestKey(key)).thenReturn(Optional.of(d));
        assertEquals("2",service.start(null,new Start(key,PropertyDossier.RightType.AUTHORIZATION)).propertyId());verify(properties,never()).saveAndFlush(any());
        d.setAccountId(8L);assertThrows(ApiException.class,()->service.start(null,new Start(key,PropertyDossier.RightType.AUTHORIZATION)));}
}

