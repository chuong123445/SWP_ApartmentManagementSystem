package com.ancu.proptech.service.auth;

import com.ancu.proptech.dto.auth.VneidNameConfirmation;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.auth.ExternalIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;

/** Bounded, process-local, five-minute pending evidence. Restart fails closed.
 * No raw external token is retained. Multi-instance routing may require retry.
 */
@Component
public class VneidLinkConfirmationStore {
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Pending> pending = new HashMap<>();
    public VneidLinkConfirmationStore() { this(Clock.systemUTC()); }
    VneidLinkConfirmationStore(Clock clock) { this.clock=clock; }
    record Pending(Long accountId, String sessionId, long version, String displayName,
                   ExternalIdentity identity, Instant expiresAt) {
        @Override public String toString() { return "PendingVneidLink[redacted]"; }
    }

    synchronized VneidNameConfirmation create(AuthAccount account, Jwt session, ExternalIdentity identity, Instant tokenExpiry) {
        Instant now=clock.instant();
        pending.values().removeIf(p -> !p.expiresAt().isAfter(now));
        String sid=sessionId(session);
        // A new attempt invalidates earlier previews for this account/session.
        pending.values().removeIf(p -> p.accountId().equals(account.getId()) && p.sessionId().equals(sid));
        if(pending.size()>=1000) throw error(HttpStatus.TOO_MANY_REQUESTS,"VNEID_CONFIRMATION_BUSY","Hãy thử xác thực lại sau ít phút.");
        Instant expiry=now.plusSeconds(300);
        if(tokenExpiry==null || !tokenExpiry.isAfter(now)) throw invalid();
        if(tokenExpiry.isBefore(expiry)) expiry=tokenExpiry;
        byte[] bytes=new byte[32];random.nextBytes(bytes);
        String id=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        pending.put(hash(id),new Pending(account.getId(),sid,account.getVersion(),account.getFullName(),identity,expiry));
        return new VneidNameConfirmation("CONFIRMATION_REQUIRED",id,account.getFullName(),identity.getLegalName(),expiry);
    }

    synchronized Pending take(AuthAccount account, Jwt session, String id) {
        String key=hash(id);Pending value=pending.get(key);
        if(value==null || !value.accountId().equals(account.getId()) || !value.sessionId().equals(sessionId(session))) throw invalid();
        pending.remove(key); // Consume once; failure requires a new verification.
        if(!value.expiresAt().isAfter(clock.instant()) || value.version()!=account.getVersion()
                || !Objects.equals(value.displayName(),account.getFullName())) throw invalid();
        return value;
    }

    private static String sessionId(Jwt jwt) {
        String sid=jwt.getClaimAsString("sid");
        if(sid==null || sid.isBlank()) throw invalid();
        return sid;
    }
    private static String hash(String value) {
        if(value==null || value.isBlank() || value.length()>128) throw invalid();
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static com.ancu.proptech.exception.auth.AuthException invalid() {
        return error(HttpStatus.CONFLICT,"VNEID_CONFIRMATION_INVALID","Xác nhận đã hết hạn hoặc thông tin/phiên tài khoản đã thay đổi. Hãy bắt đầu xác thực lại.");
    }
}
