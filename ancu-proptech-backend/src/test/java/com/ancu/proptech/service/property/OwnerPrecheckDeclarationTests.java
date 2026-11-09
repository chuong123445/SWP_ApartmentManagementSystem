package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.ai.AssistanceRunRepository;
import com.ancu.proptech.service.ai.*;
import com.ancu.proptech.service.auth.VerifiedIdentityPolicy;
import com.ancu.proptech.service.property.ai.*;
import org.junit.jupiter.api.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import tools.jackson.databind.json.JsonMapper;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class OwnerPrecheckDeclarationTests {
 @Test void declaredPropertyChangesInvalidateTheReviewHashWithoutProviderCall(){
  var access=mock(PropertyApplicantAccess.class);var files=mock(PropertyEvidenceFileRepository.class);
  var client=mock(DossierAiClient.class);var manager=mock(PlatformTransactionManager.class);var identities=mock(VerifiedIdentityPolicy.class);
  var service=new OwnerPrecheckService(access,files,mock(PropertyEvidenceContentRepository.class),mock(PropertyDossierRepository.class),client,mock(AssistanceAudit.class),mock(AssistanceLimit.class),JsonMapper.builder().build(),manager,identities,mock(AssistanceRunRepository.class));
  when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
  var owner=new AuthAccount();owner.setId(1L);owner.setFullName("Applicant");
  var property=new Property();property.setId(2L);property.setOwner(owner);property.setName("Placeholder");property.setAddress("");property.setApprovalStatus(Property.ApprovalStatus.DRAFT);
  when(access.read(null,2L)).thenReturn(property);when(identities.verified(1L)).thenReturn(Optional.empty());
  var draft=new PropertyDossierSubmit();draft.setPropertyVersion(0L);draft.setRightType(PropertyDossier.RightType.OWNERSHIP);draft.setDocumentFileIds(List.of());
  var first=new OwnerPrecheckDtos.PropertyFields("Nhà A","12 Đường A","Thành phố","Khu vực",null);
  var second=new OwnerPrecheckDtos.PropertyFields("Nhà A","14 Đường A","Thành phố","Khu vực",null);
  var a=service.check(null,2L,new OwnerPrecheckDtos.Request(draft,null,null,false,first));
  var b=service.check(null,2L,new OwnerPrecheckDtos.Request(draft,null,null,false,second));
  var repeated=service.check(null,2L,new OwnerPrecheckDtos.Request(draft,null,null,false,first));
  assertNotEquals(a.sourceHash(),b.sourceHash());assertEquals(a.sourceHash(),repeated.sourceHash());verifyNoInteractions(client);
 }
}
