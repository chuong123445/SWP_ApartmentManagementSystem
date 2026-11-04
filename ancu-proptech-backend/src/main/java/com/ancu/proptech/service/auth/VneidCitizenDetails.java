package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.ExternalIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import java.time.*;
import java.time.format.*;
import java.util.Objects;
import static com.ancu.proptech.service.auth.AccountService.error;

/** Optional provider details never change the identity binding or contact verification flags. */
final class VneidCitizenDetails {
    private VneidCitizenDetails() {}
    static boolean present(Jwt jwt) {
        return java.util.stream.Stream.of("phone_number","document_issue_date","document_issue_place","permanent_address")
                .anyMatch(key -> jwt.getClaims().containsKey(VneidTokenVerifier.NS+key));
    }
    static void read(Jwt jwt, ExternalIdentity target) {
        String phone=optional(jwt,"phone_number",20), date=optional(jwt,"document_issue_date",10);
        String place=optional(jwt,"document_issue_place",200), permanent=optional(jwt,"permanent_address",500);
        if(phone!=null && !phone.matches("\\+[1-9][0-9]{7,14}"))throw invalid();
        if((date==null)!=(place==null))throw invalid();
        LocalDate issued=null;
        if(date!=null) {
            try { issued=LocalDate.parse(date,DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT)); }
            catch(DateTimeParseException ex){throw invalid();}
            if(issued.isAfter(LocalDate.now()) || issued.isBefore(target.getDateOfBirth()))throw invalid();
        }
        target.setPhoneNumber(phone);target.setDocumentIssueDate(issued);target.setDocumentIssuePlace(place);target.setPermanentAddress(permanent);
    }
    static boolean fillMissing(ExternalIdentity saved, ExternalIdentity incoming) {
        if(!Objects.equals(saved.getIssuer(),incoming.getIssuer()) || !Objects.equals(saved.getSubject(),incoming.getSubject())
                || !Objects.equals(saved.getDocumentNumber(),incoming.getDocumentNumber()) || !Objects.equals(saved.getLegalName(),incoming.getLegalName())
                || !Objects.equals(saved.getDateOfBirth(),incoming.getDateOfBirth()) || !Objects.equals(saved.getGender(),incoming.getGender())
                || !Objects.equals(saved.getAddress(),incoming.getAddress()) || !"VERIFIED".equals(saved.getVerificationStatus()))
            throw error(HttpStatus.CONFLICT,"VNEID_DETAILS_IDENTITY_CHANGED","Thông tin định danh nguồn đã thay đổi. Không tự ghi đè căn cước đã liên kết.");
        boolean changed=false;
        if(saved.getPhoneNumber()==null && incoming.getPhoneNumber()!=null){saved.setPhoneNumber(incoming.getPhoneNumber());changed=true;}
        // Keep date/place together; never combine a prior date with another source's place.
        if(saved.getDocumentIssueDate()==null && saved.getDocumentIssuePlace()==null && incoming.getDocumentIssueDate()!=null){
            saved.setDocumentIssueDate(incoming.getDocumentIssueDate());saved.setDocumentIssuePlace(incoming.getDocumentIssuePlace());changed=true;
        }
        if(saved.getPermanentAddress()==null && incoming.getPermanentAddress()!=null){saved.setPermanentAddress(incoming.getPermanentAddress());changed=true;}
        if(changed)saved.setDetailsUpdatedAt(Instant.now());
        return changed;
    }
    private static String optional(Jwt jwt,String key,int max) {
        Object raw=jwt.getClaims().get(VneidTokenVerifier.NS+key);
        if(raw==null)return null;
        if(!(raw instanceof String value) || value.isBlank() || value.length()>max || value.chars().anyMatch(Character::isISOControl))throw invalid();
        return value.strip();
    }
    private static com.ancu.proptech.exception.auth.AuthException invalid(){
        return error(HttpStatus.BAD_REQUEST,"VNEID_CLAIMS_INVALID","Thông tin căn cước bổ sung từ Auth0 không hợp lệ.");
    }
}
