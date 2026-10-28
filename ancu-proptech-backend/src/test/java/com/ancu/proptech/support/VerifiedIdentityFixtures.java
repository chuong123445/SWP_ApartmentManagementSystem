package com.ancu.proptech.support;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;
import com.ancu.proptech.service.auth.VneidTokenVerifier;
import java.time.*;

public final class VerifiedIdentityFixtures {
    private VerifiedIdentityFixtures(){}
    public static ExternalIdentity bind(ExternalIdentityRepository repository,AuthAccount account){
        var i=new ExternalIdentity();i.setAccountId(account.getId());i.setIssuer("https://rights-fixture.invalid/");i.setSubject("auth0|"+com.ancu.proptech.support.TestIds.next());
        i.setDocumentNumber(String.format("%012d",Math.abs(com.ancu.proptech.support.TestIds.next().longValue()%1000000000000L)));i.setLegalName("Căn cước đã xác thực");i.setDateOfBirth(LocalDate.of(1990,1,1));i.setGender("Nam");i.setAddress("Địa chỉ kiểm thử");i.setSource(VneidTokenVerifier.SOURCE);i.setVerificationStatus("VERIFIED");i.setVerifiedAt(Instant.now());return repository.saveAndFlush(i);
    }
}
