package com.ancu.proptech.controller.property;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AuthService;
import com.ancu.proptech.service.property.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class PropertyRightNoticeIntegrationTests {
    @Autowired PropertyRightNoticeService service;@Autowired PropertyRightNoticeRepository notices;@Autowired PropertyRepository properties;
    @Autowired PropertyDossierRepository dossiers;@Autowired AuthAccountRepository accounts;@Autowired AuthService auth;@Autowired MockMvc mvc;
    @MockitoBean PropertyNoticeEmailSender email;
    Property p;AuthAccount owner;LocalDate today;
    @BeforeEach void setup(){today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));owner=new AuthAccount();owner.setEmail("notice-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");owner.setFullName("Người nhận nhắc hạn");owner.setRole(AuthAccount.Role.OWNER);owner.setStatus(AuthAccount.Status.ACTIVE);owner.setEmailVerified(true);accounts.saveAndFlush(owner);
        p=new Property();p.setOwner(owner);p.setName("Tài sản nhắc hạn");p.setAddress("Địa chỉ kiểm thử");p.setCity("City");p.setDistrict("District");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);p.setRightType(PropertyDossier.RightType.AUTHORIZATION);p.setRightsValidFrom(today.minusMonths(3));p.setRightsValidUntil(today.plusDays(30));properties.saveAndFlush(p);
        var d=new PropertyDossier();d.setProperty(p);d.setRightType(PropertyDossier.RightType.AUTHORIZATION);d.setApplicantName(owner.getFullName());d.setBank("Bank");d.setAccountNumber("1234567890");d.setAccountHolderName(owner.getFullName());d.setStatus(PropertyDossier.Status.APPROVED);d.setSubmittedAt(Instant.now());dossiers.saveAndFlush(d);p.setApprovedRightsDossierId(d.getId());properties.flush();when(email.isConfigured()).thenReturn(true);
    }
    PropertyRightNotice notice(){return notices.findByRecipientIdOrderByCreatedAtDescIdDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10)).get(0);}
    @Test void exactlyThirtyDaysCreatesOneAppNoticeAndSendsOnce(){service.generate(today);service.generate(today);assertEquals(1,notices.findByRecipientIdOrderByCreatedAtDescIdDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10)).size());service.deliver();service.deliver();verify(email,times(1)).send(owner.getEmail(),p.getName(),p.getRightsValidUntil(),false);assertEquals("SENT",notice().getEmailStatus());}
    @Test void beyondThirtyDaysHasNoReminder(){p.setRightsValidUntil(today.plusDays(31));properties.flush();service.generate(today);assertFalse(notices.existsByDossierIdAndKind(p.getApprovedRightsDossierId(),"EXPIRING"));}
    @Test void endDateIsInclusiveAndExpiredNoticeStartsFollowingDay(){p.setRightsValidUntil(today);properties.flush();service.generate(today);assertTrue(notices.existsByDossierIdAndKind(p.getApprovedRightsDossierId(),"EXPIRING"));service.generate(today.plusDays(1));assertTrue(notices.existsByDossierIdAndKind(p.getApprovedRightsDossierId(),"EXPIRED"));assertEquals(Property.ApprovalStatus.APPROVED,p.getApprovalStatus());}
    @Test void unverifiedEmailOnlyGetsInApp(){owner.setEmailVerified(false);accounts.flush();service.generate(today);service.deliver();assertEquals("SKIPPED",notice().getEmailStatus());verify(email,never()).send(anyString(),anyString(),any(),anyBoolean());}
    @Test void changedEmailAndReplacedDossierDoNotSendStaleMail(){service.generate(today);owner.setEmail("changed@example.invalid");accounts.flush();service.deliver();assertEquals("SKIPPED",notice().getEmailStatus());verify(email,never()).send(anyString(),anyString(),any(),anyBoolean());}
    @Test void smtpFailurePreservesAppNoticeAndRetries(){service.generate(today);doThrow(new RuntimeException("fixture transport unavailable")).when(email).send(anyString(),anyString(),any(),anyBoolean());service.deliver();assertEquals("RETRY",notice().getEmailStatus());assertEquals(1,notice().getAttempts());notice().setNextAttemptAt(Instant.now().minusSeconds(1));notices.flush();doNothing().when(email).send(anyString(),anyString(),any(),anyBoolean());service.deliver();assertEquals("SENT",notice().getEmailStatus());assertEquals(2,notice().getAttempts());}
    @Test void missingSmtpDoesNotConsumeAttempts(){when(email.isConfigured()).thenReturn(false);service.generate(today);service.deliver();assertEquals(0,notice().getAttempts());assertEquals("PENDING",notice().getEmailStatus());}
    @Test void expiredSendingLeaseCanRetryButFifthCrashedAttemptIsFinal(){service.generate(today);notice().setEmailStatus("SENDING");notice().setAttempts(5);notice().setNextAttemptAt(Instant.now().minusSeconds(1));notices.flush();service.deliver();assertEquals("FAILED",notice().getEmailStatus());verify(email,never()).send(anyString(),anyString(),any(),anyBoolean());}
    @Test void renewedRightsCancelUnsentOldDossierEmail(){service.generate(today);p.setApprovedRightsDossierId(null);properties.flush();service.deliver();assertEquals("SKIPPED",notice().getEmailStatus());verify(email,never()).send(anyString(),anyString(),any(),anyBoolean());}
    @Test void noticeEndpointIsSelfOnly()throws Exception{service.generate(today);String token=auth.createSession(owner).tokens().accessToken();mvc.perform(get("/api/v1/me/property-notices").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$[0].kind").value("EXPIRING")).andExpect(jsonPath("$[0].emailDestination").doesNotExist());var other=new AuthAccount();other.setEmail("other-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");other.setFullName("Khác");other.setRole(AuthAccount.Role.CUSTOMER);other.setStatus(AuthAccount.Status.ACTIVE);accounts.saveAndFlush(other);mvc.perform(get("/api/v1/me/property-notices").header("Authorization","Bearer "+auth.createSession(other).tokens().accessToken())).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));}
}
