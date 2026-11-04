package com.ancu.proptech.service.auth;

import com.ancu.proptech.config.auth.VneidProperties;
import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jwt.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VneidNameConfirmationTests {
    AuthAccountRepository accounts; ExternalIdentityRepository identities; AuthService auth;
    VneidTokenVerifier verifier; VneidProperties config; VneidService service;
    VneidLinkConfirmationStore store; AuthAccount account; Jwt session,external;
    @BeforeEach void setup() {
        accounts=mock(AuthAccountRepository.class);identities=mock(ExternalIdentityRepository.class);
        auth=mock(AuthService.class);verifier=mock(VneidTokenVerifier.class);
        config=new VneidProperties();config.setEnabled(true);config.setIssuer("https://issuer.invalid/");
        store=new VneidLinkConfirmationStore();
        service=new VneidService(accounts,identities,auth,verifier,config,store,mock(EntityManager.class));
        account=new AuthAccount();account.setId(1L);account.setFullName("Tên hiển thị");account.setVersion(2);
        account.setRole(AuthAccount.Role.CUSTOMER);account.setStatus(AuthAccount.Status.PENDING_VERIFICATION);
        session=session("one");external=Jwt.withTokenValue("external").header("alg","RS256").subject("auth0|self")
            .expiresAt(Instant.now().plusSeconds(600)).claim(VneidTokenVerifier.NS+"cccd_number","000000000001")
            .claim(VneidTokenVerifier.NS+"full_name","Nguyễn Văn A").claim(VneidTokenVerifier.NS+"dob","20/05/1990")
            .claim(VneidTokenVerifier.NS+"gender","Nam").claim(VneidTokenVerifier.NS+"address","Địa chỉ kiểm thử").build();
        when(auth.authenticate(any())).thenReturn(account);
        when(accounts.findForIdentityUpdate(1L)).thenReturn(Optional.of(account));
        when(verifier.decode("external")).thenReturn(external);
    }
    Jwt session(String sid) { return Jwt.withTokenValue("internal").header("alg","HS256").subject("1").claim("sid",sid).build(); }
    String preview() { return service.verifySelf(session,"external").confirmation().confirmationId(); }
    void noBinding() {
        verify(identities,never()).saveAndFlush(any());assertFalse(account.isIdentityVerified());
        assertEquals(AuthAccount.Status.PENDING_VERIFICATION,account.getStatus());
    }
    @Test void mismatchIsOnlyPrivatePreviewWithoutActivationOrNameOverwrite() {
        var result=service.verifySelf(session,"external");assertNull(result.user());
        assertEquals("Tên hiển thị",result.confirmation().displayName());assertEquals("Nguyễn Văn A",result.confirmation().legalName());
        assertEquals("CONFIRMATION_REQUIRED",result.confirmation().status());noBinding();
        assertEquals("Tên hiển thị",account.getFullName());
    }
    @Test void normalizationHandlesCaseUnicodeAndSpacesButKeepsAccents() {
        account.setFullName("  NGUYỄN\u00a0 VĂN   A  ");
        assertNull(service.verifySelf(session,"external").confirmation());
        verify(identities).saveAndFlush(argThat(i->i.getLegalName().equals("Nguyễn Văn A")));
        assertNotEquals(VneidService.normalizedName("Nguyen Van A"),VneidService.normalizedName("Nguyễn Văn A"));
    }
    @Test void explicitConfirmationBindsSavedEvidencePreservesDisplayRoleAndContactFlags() {
        String id=preview();service.confirmSelf(session,id);
        verify(identities).saveAndFlush(argThat(i->i.getAccountId()==1L && i.getLegalName().equals("Nguyễn Văn A")));
        assertTrue(account.isIdentityVerified());assertEquals(AuthAccount.Status.ACTIVE,account.getStatus());
        assertEquals("Tên hiển thị",account.getFullName());assertEquals(AuthAccount.Role.CUSTOMER,account.getRole());
        assertFalse(account.isEmailVerified());assertFalse(account.isPhoneVerified());
        assertThrows(AuthException.class,()->service.confirmSelf(session,id));
    }
    @Test void cancelConsumesPreviewWithoutBinding() {
        String id=preview();service.cancelSelf(session,id);noBinding();
        assertThrows(AuthException.class,()->service.confirmSelf(session,id));
    }
    @Test void differentSessionCannotConfirmOrCancelAndDoesNotConsumeOwnersPreview() {
        String id=preview();assertThrows(AuthException.class,()->service.confirmSelf(session("other"),id));
        assertThrows(AuthException.class,()->service.cancelSelf(session("other"),id));noBinding();
        service.confirmSelf(session,id);verify(identities).saveAndFlush(any());
    }
    @Test void differentAccountCannotUsePreview() {
        String id=preview();var other=new AuthAccount();other.setId(2L);
        assertThrows(AuthException.class,()->store.take(other,session,id));noBinding();
    }
    @Test void editedProfileInvalidatesPreview() {
        String id=preview();account.setVersion(3);
        assertThrows(AuthException.class,()->service.confirmSelf(session,id));noBinding();
    }
    @Test void sameVersionButDifferentNameStillInvalidatesPreview() {
        String id=preview();account.setFullName("Changed");
        assertThrows(AuthException.class,()->service.confirmSelf(session,id));noBinding();
    }
    @Test void takenDocumentOrSubjectIsRecheckedAtConfirmation() {
        String id=preview();when(identities.existsByDocumentNumber("000000000001")).thenReturn(true);
        assertThrows(AuthException.class,()->service.confirmSelf(session,id));noBinding();
    }
    @Test void lockedAccountAndDisabledProviderCannotFinish() {
        String id=preview();account.setStatus(AuthAccount.Status.LOCKED);
        assertThrows(AuthException.class,()->service.confirmSelf(session,id));
        verify(identities,never()).saveAndFlush(any());
        account.setStatus(AuthAccount.Status.PENDING_VERIFICATION);config.setEnabled(false);
        assertThrows(AuthException.class,()->service.confirmSelf(session,id));noBinding();
    }
    @Test void duplicateSameBindingDoesNotRewriteEvidence() {
        var identity=new ExternalIdentity();identity.setIssuer(config.getIssuer());identity.setSubject(external.getSubject());
        when(identities.findById(1L)).thenReturn(Optional.of(identity));
        assertNull(service.verifySelf(session,"external").confirmation());noBinding();
    }
    @Test void newerAttemptInvalidatesOlderPreview() {
        String old=preview(),fresh=preview();assertNotEquals(old,fresh);
        assertThrows(AuthException.class,()->service.confirmSelf(session,old));
        service.confirmSelf(session,fresh);verify(identities).saveAndFlush(any());
    }
    @Test void forgedOrRestartedConfirmationFailsClosed() {
        String id=preview();assertThrows(AuthException.class,()->store.take(account,session,"forged"));
        assertThrows(AuthException.class,()->new VneidLinkConfirmationStore().take(account,session,id));noBinding();
    }
    @Test void expiryIsCappedByExternalTokenAndExpiresAtBoundary() {
        Instant now=Instant.parse("2026-11-02T00:00:00Z");
        class MutableClock extends Clock {
            Instant instant=now;public Instant instant(){return instant;}
            public ZoneId getZone(){return ZoneOffset.UTC;} public Clock withZone(ZoneId z){return this;}
        }
        var clock=new MutableClock();var shortStore=new VneidLinkConfirmationStore(clock);
        var identity=new ExternalIdentity();identity.setLegalName("Legal");
        var preview=shortStore.create(account,session,identity,now.plusSeconds(10));
        assertEquals(now.plusSeconds(10),preview.expiresAt());clock.instant=now.plusSeconds(10);
        assertThrows(AuthException.class,()->shortStore.take(account,session,preview.confirmationId()));
    }
}
