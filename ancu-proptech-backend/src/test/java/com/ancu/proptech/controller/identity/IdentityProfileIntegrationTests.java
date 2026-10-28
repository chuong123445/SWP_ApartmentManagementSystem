package com.ancu.proptech.controller.identity;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.identity.*;
import com.ancu.proptech.service.auth.*;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class IdentityProfileIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired IdentityProfileRepository profiles;
    @Autowired IdentityDocumentsRepository documents;@Autowired AuthService auth;@Autowired PasswordEncoder passwords;
    @Autowired AccountVerificationPolicy policy;
    private AuthAccount customer,other;private String token;private byte[] png;private static String hash;
    @BeforeEach void fixture()throws Exception{
        if(hash==null)hash=passwords.encode("Identity-test!12345");
        customer=account(AuthAccount.Role.CUSTOMER,false);other=account(AuthAccount.Role.CUSTOMER,true);token=token(customer);
        var output=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(3,2,BufferedImage.TYPE_INT_RGB),"png",output);png=output.toByteArray();
    }
    private AuthAccount account(AuthAccount.Role role,boolean verified){var a=new AuthAccount();a.setEmail("identity-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Tên hồ sơ hiển thị");a.setRole(role);a.setStatus(verified?AuthAccount.Status.ACTIVE:AuthAccount.Status.PENDING_VERIFICATION);a.setEmailVerified(verified);a.setContactVerified(verified);a.setPasswordHash(hash);return accounts.saveAndFlush(a);}
    private String token(AuthAccount a){return auth.login(a.getEmail(),"Identity-test!12345").tokens().accessToken();}
    private String input(String version){return """
        {"legalName":" Nguyễn Văn Thử ","documentNumber":"001095000123","dateOfBirth":"1995-06-15","issueDate":"2022-05-01","issuePlace":"Cục Cảnh sát QLHC về TTXH","permanentAddress":"Địa chỉ trên căn cước","currentAddress":"Địa chỉ đang sinh sống","version":%s}
        """.formatted(version);}
    private ResultActions save(String actor,String json,byte[] front,byte[] back)throws Exception{
        var request=multipart("/api/v1/me/identity").file(new MockMultipartFile("profile","","application/json",json.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        if(front!=null)request.file(new MockMultipartFile("front","../../front.png","image/png",front));
        if(back!=null)request.file(new MockMultipartFile("back","back.png","image/png",back));
        return mvc.perform(request.with(r->{r.setMethod("PUT");return r;}).header("Authorization","Bearer "+actor));
    }
    @Test void pendingCanStoreOwnCompleteIdentityWithoutVerifyingOrChangingContactProfile()throws Exception{
        mvc.perform(get("/api/v1/me/identity").header("Authorization","Bearer "+token)).andExpect(status().isNoContent()).andExpect(header().string("Cache-Control","no-store"));
        save(token,input("null"),png,png).andExpect(status().isOk()).andExpect(jsonPath("$.legalName").value("Nguyễn Văn Thử")).andExpect(jsonPath("$.verificationStatus").value("NOT_VERIFIED"));
        assertFalse(policy.isVerified(customer));assertFalse(customer.isEmailVerified());assertEquals(AuthAccount.Status.PENDING_VERIFICATION,customer.getStatus());assertEquals("Tên hồ sơ hiển thị",customer.getFullName());
        assertTrue(profiles.existsById(customer.getId()));
    }
    @Test void imagesAndMetadataAreOnlyAvailableToTheirAccountEvenForOwnerOrAdmin()throws Exception{
        save(token,input("null"),png,png).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/identity/documents/front")).andExpect(status().isUnauthorized());
        for(var actor:List.of(other,account(AuthAccount.Role.OWNER,true),account(AuthAccount.Role.ADMIN,true))){
            mvc.perform(get("/api/v1/me/identity").header("Authorization","Bearer "+token(actor))).andExpect(status().isNoContent());
            mvc.perform(get("/api/v1/me/identity/documents/front").header("Authorization","Bearer "+token(actor))).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/v1/me/identity/documents/front").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(content().contentType("image/png")).andExpect(header().string("Cache-Control","no-store")).andExpect(header().string("X-Content-Type-Options","nosniff"));
        mvc.perform(get("/api/v1/me/identity/documents/unknown").header("Authorization","Bearer "+token)).andExpect(status().isNotFound());
    }
    @Test void updatePreservesOmittedImagesAndRejectsStaleOrDuplicateCreation()throws Exception{
        String result=save(token,input("null"),png,png).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Number version=JsonPath.read(result,"$.version");byte[] original=documents.findById(customer.getId()).orElseThrow().getFrontContent().clone();
        save(token,input("null"),png,png).andExpect(status().isConflict());
        save(token,input("99"),null,null).andExpect(status().isConflict());
        save(token,input(version.toString()).replace("Nguyễn Văn Thử","Nguyễn Văn Mới"),null,null).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(version.longValue()+1));
        assertArrayEquals(original,documents.findById(customer.getId()).orElseThrow().getFrontContent());
    }
    @Test void requiresBothRealRasterImagesAndRejectsEmptyFakeAndOversizedFilesAtomically()throws Exception{
        save(token,input("null"),png,null).andExpect(status().isBadRequest());
        save(token,input("null"),png,"<svg/>".getBytes()).andExpect(status().isBadRequest());
        save(token,input("null"),new byte[0],png).andExpect(status().isBadRequest());
        save(token,input("null"),new byte[5*1024*1024+1],png).andExpect(status().isBadRequest());
        assertFalse(profiles.existsById(customer.getId()));assertFalse(documents.existsById(customer.getId()));
    }
    @Test void rejectsForgedStatusAccountAndInvalidFieldsOrVersions()throws Exception{
        for(String body:List.of(input("null").replace("001095000123","123"),input("null").replace("1995-06-15","2099-01-01"),input("null").replace("2022-05-01","1990-01-01"),input("0.5"),input("null").replace("\"version\":null","\"verificationStatus\":\"VERIFIED\",\"version\":null"),input("null").replace("\"version\":null","\"accountId\":\""+other.getId()+"\",\"version\":null")))
            save(token,body,png,png).andExpect(status().isBadRequest());
        assertFalse(profiles.existsById(customer.getId()));
    }
    @Test void successfulCollectionDoesNotChangeEmailVerificationEligibility()throws Exception{
        save(token(other),input("null"),png,png).andExpect(status().isOk());assertTrue(policy.isVerified(other));
        assertEquals("NOT_VERIFIED",profiles.findById(other.getId()).orElseThrow().getVerificationStatus().name());
        mvc.perform(get("/api/v1/me/profile").header("Authorization","Bearer "+token(other))).andExpect(status().isOk()).andExpect(jsonPath("$.documentNumber").doesNotExist());
    }
    @Test void sampleFlagSurvivesTextOrOneImageEditsUntilBothImagesAreReplaced()throws Exception{
        save(token,input("null"),png,png).andExpect(status().isOk());var profile=profiles.findById(customer.getId()).orElseThrow();profile.setLocalFixture(true);profiles.saveAndFlush(profile);
        save(token,input(Long.toString(profile.getVersion())),png,null).andExpect(status().isOk()).andExpect(jsonPath("$.localFixture").value(true));
        save(token,input(Long.toString(profile.getVersion())),png,png).andExpect(status().isOk()).andExpect(jsonPath("$.localFixture").value(false)).andExpect(jsonPath("$.verificationStatus").value("NOT_VERIFIED"));
    }
}
