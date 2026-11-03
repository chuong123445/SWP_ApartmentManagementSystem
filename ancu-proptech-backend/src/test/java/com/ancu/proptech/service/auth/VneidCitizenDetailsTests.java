package com.ancu.proptech.service.auth;

import com.ancu.proptech.exception.auth.AuthException;
import com.ancu.proptech.model.auth.ExternalIdentity;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import java.time.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class VneidCitizenDetailsTests {
    ExternalIdentity identity() {
        var i=new ExternalIdentity();i.setIssuer("https://issuer.invalid/");i.setSubject("auth0|one");
        i.setDocumentNumber("999000000004");i.setLegalName("TRẦN THỊ THU HÀ");i.setDateOfBirth(LocalDate.of(1992,9,21));
        i.setGender("Nữ");i.setAddress("54 Hoàng Diệu, Hải Châu, Đà Nẵng");i.setVerificationStatus("VERIFIED");
        i.setVerifiedAt(Instant.parse("2026-10-28T00:00:00Z"));return i;
    }
    Jwt token(Map<String,Object> values) {
        var builder=Jwt.withTokenValue("evidence").header("alg","RS256").subject("auth0|one");
        values.forEach((k,v)->builder.claim(VneidTokenVerifier.NS+k,v));return builder.build();
    }
    Map<String,Object> complete() {return Map.of("phone_number","+84999000002","document_issue_date","16/06/2021",
        "document_issue_place","Cục Cảnh sát quản lý hành chính về trật tự xã hội","permanent_address","54 Hoàng Diệu, phường Phước Ninh, quận Hải Châu, thành phố Đà Nẵng");}
    @Test void oldTokensRemainValidWithoutInventingDetails() {
        var i=identity();var jwt=token(Map.of());assertFalse(VneidCitizenDetails.present(jwt));VneidCitizenDetails.read(jwt,i);
        assertNull(i.getPhoneNumber());assertNull(i.getDocumentIssueDate());assertNull(i.getDocumentIssuePlace());assertNull(i.getPermanentAddress());
    }
    @Test void acceptsConcreteProviderFieldsWithoutMarkingPhoneVerified() {
        var i=identity();VneidCitizenDetails.read(token(complete()),i);
        assertEquals("+84999000002",i.getPhoneNumber());assertEquals(LocalDate.of(2021,6,16),i.getDocumentIssueDate());
        assertEquals(complete().get("document_issue_place"),i.getDocumentIssuePlace());assertEquals(complete().get("permanent_address"),i.getPermanentAddress());
    }
    @Test void strictDatesRejectImpossibleFutureAndPreBirthDates() {
        for(String date:new String[]{"31/02/2021","16/06/2999","16/06/1990","2021-06-16"}) {
            var input=new java.util.HashMap<String,Object>(complete());input.put("document_issue_date",date);
            assertThrows(AuthException.class,()->VneidCitizenDetails.read(token(input),identity()));
        }
    }
    @Test void invalidTypesLengthsControlsPhoneAndIncompleteIssueGroupAreRejected() {
        for(var input:java.util.List.<Map<String,Object>>of(Map.of("phone_number",84999000002L),Map.of("phone_number","0900000000"),
                Map.of("document_issue_date","16/06/2021"),Map.of("document_issue_place","Cơ quan cấp"),
                Map.of("permanent_address","x".repeat(501)),Map.of("permanent_address","Địa chỉ\nKhác")))
            assertThrows(AuthException.class,()->VneidCitizenDetails.read(token(input),identity()));
    }
    @Test void fillsOnlyMissingFieldsKeepsBindingVerifiedTimeAndPreviouslySavedValues() {
        var saved=identity();saved.setPhoneNumber("+84999000999");var incoming=identity();VneidCitizenDetails.read(token(complete()),incoming);
        var originalTime=saved.getVerifiedAt();assertTrue(VneidCitizenDetails.fillMissing(saved,incoming));
        assertEquals("+84999000999",saved.getPhoneNumber());assertEquals(originalTime,saved.getVerifiedAt());
        assertNotNull(saved.getDetailsUpdatedAt());assertEquals("auth0|one",saved.getSubject());assertEquals("VERIFIED",saved.getVerificationStatus());
        assertFalse(VneidCitizenDetails.fillMissing(saved,incoming));
    }
    @Test void coreIdentityChangesCannotSupplementEvenOneMissingField() {
        for(String field:new String[]{"subject","number","name","birth","gender","address","issuer","status"}) {
            var saved=identity();var incoming=identity();VneidCitizenDetails.read(token(complete()),incoming);
            switch(field){case "subject"->incoming.setSubject("auth0|other");case "number"->incoming.setDocumentNumber("999000000005");
                case "name"->incoming.setLegalName("Tên khác");case "birth"->incoming.setDateOfBirth(LocalDate.of(1990,1,1));
                case "gender"->incoming.setGender("Nam");case "address"->incoming.setAddress("Địa chỉ khác");
                case "issuer"->incoming.setIssuer("https://other.invalid/");case "status"->saved.setVerificationStatus("UNVERIFIED");}
            assertThrows(AuthException.class,()->VneidCitizenDetails.fillMissing(saved,incoming));assertNull(saved.getPhoneNumber());
        }
    }
    @Test void willNotCombineOldIssueDateWithNewPlace() {
        var saved=identity();saved.setDocumentIssueDate(LocalDate.of(2020,1,1));var incoming=identity();VneidCitizenDetails.read(token(complete()),incoming);
        VneidCitizenDetails.fillMissing(saved,incoming);assertEquals(LocalDate.of(2020,1,1),saved.getDocumentIssueDate());assertNull(saved.getDocumentIssuePlace());
    }
}
