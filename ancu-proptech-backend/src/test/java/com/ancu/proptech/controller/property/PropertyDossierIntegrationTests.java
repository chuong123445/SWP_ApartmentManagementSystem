package com.ancu.proptech.controller.property;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.service.auth.AuthService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class PropertyDossierIntegrationTests {
    @Autowired MockMvc mvc;@Autowired AuthAccountRepository accounts;@Autowired PropertyRepository properties;
    @Autowired ApartmentRepository apartments;@Autowired PropertyDossierRepository dossiers;@Autowired PropertyEvidenceFileRepository files;
    @Autowired PasswordEncoder passwords;@Autowired AuthService auth;
    @Autowired com.ancu.proptech.repository.auth.ExternalIdentityRepository externalIdentities;
    private AuthAccount owner,other,admin,customer;private Property property,foreignProperty;private String ownerToken,adminToken;private byte[] png;
    private static String passwordHash;
    @BeforeEach void fixture()throws Exception{
        if(passwordHash==null)passwordHash=passwords.encode("Dossier-test!12345");
        owner=account(AuthAccount.Role.OWNER);other=account(AuthAccount.Role.OWNER);admin=account(AuthAccount.Role.ADMIN);customer=account(AuthAccount.Role.CUSTOMER);
        com.ancu.proptech.support.VerifiedIdentityFixtures.bind(externalIdentities,owner);com.ancu.proptech.support.VerifiedIdentityFixtures.bind(externalIdentities,other);
        property=property(owner);foreignProperty=property(other);ownerToken=token(owner);adminToken=token(admin);
        var output=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"png",output);png=output.toByteArray();
    }
    private AuthAccount account(AuthAccount.Role role){var a=new AuthAccount();a.setEmail("dossier-"+com.ancu.proptech.support.TestIds.next()+"@example.invalid");a.setFullName("Nguyễn Kiểm Thử");a.setPasswordHash(passwordHash);a.setRole(role);a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(role!=AuthAccount.Role.ADMIN);a.setContactVerified(role!=AuthAccount.Role.ADMIN);return accounts.saveAndFlush(a);}
    private Property property(AuthAccount owner){var p=new Property();p.setOwner(owner);p.setName("Tài sản kiểm thử");p.setAddress("12 Đường kiểm thử");p.setCity("City");p.setDistrict("District");p.setApprovalStatus(Property.ApprovalStatus.DRAFT);return properties.saveAndFlush(p);}
    private String token(AuthAccount a){return auth.login(a.getEmail(),"Dossier-test!12345").tokens().accessToken();}
    private ResultActions upload(String token,Property p,String purpose,byte[] bytes)throws Exception{return mvc.perform(multipart("/api/v1/owner/properties/"+p.getId()+"/evidence-files").file(new MockMultipartFile("file","../../giay-to.png","image/png",bytes)).param("purpose",purpose).header("Authorization","Bearer "+token));}
    private String uploadRight()throws Exception{return JsonPath.read(upload(ownerToken,property,"RIGHT_DOCUMENT",png).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),"$.id");}
    private String body(String file,long version){return """
        {"propertyVersion":%d,"rightType":"OWNERSHIP","receivingAccount":{"bank":"Ngân hàng kiểm thử","accountNumber":"1234567890","accountHolderName":"Nguyễn Kiểm Thử"},"documentFileIds":["%s"]}
        """.formatted(version,file);}
    private ResultActions submit(String token,Property p,String input)throws Exception{return mvc.perform(post("/api/v1/owner/properties/"+p.getId()+"/verification-dossiers").header("Authorization","Bearer "+token).contentType("application/json").content(input));}
    private String send(String file)throws Exception{return JsonPath.read(submit(ownerToken,property,body(file,property.getVersion())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),"$.id");}
    private ResultActions decision(String token,String id,String choice,String reason,long version)throws Exception{return mvc.perform(post("/api/v1/admin/property-dossiers/"+id+"/decisions").header("Authorization","Bearer "+token).contentType("application/json").content("{\"decision\":\""+choice+"\",\"reason\":\""+reason+"\",\"version\":"+version+"}"));}
    private String createApartment()throws Exception{var result=mvc.perform(post("/api/v1/owner/apartments").header("Authorization","Bearer "+ownerToken).contentType("application/json").content("{\"propertyId\":\""+property.getId()+"\",\"roomNumber\":\"A.1\",\"title\":\"Căn kiểm thử\",\"floor\":1,\"areaM2\":\"30\",\"advertisedMonthlyRent\":\"5000000\"}")).andExpect(status().isCreated()).andReturn();return JsonPath.read(result.getResponse().getContentAsString(),"$.id");}
    private ResultActions publish(String token,String apartment,long version,String publication)throws Exception{return mvc.perform(post("/api/v1/owner/apartments/"+apartment+"/publication").header("Authorization","Bearer "+token).contentType("application/json").content("{\"publicationStatus\":\""+publication+"\",\"version\":"+version+"}"));}
    @Test void optionalCertificateRequiresWholeGroupAndCannotForgeFixtureFlag()throws Exception{
        String file=uploadRight(),base=body(file,property.getVersion());
        submit(ownerToken,property,base.replace("\"rightType\"","\"certificateNumber\":\"MAU-001\",\"rightType\"")).andExpect(status().isBadRequest());
        submit(ownerToken,property,base.replace("\"rightType\"","\"localFixture\":true,\"rightType\"")).andExpect(status().isBadRequest());
        String valid=base.replace("\"rightType\"","\"certificateNumber\":\" MAU-001 \",\"certificateIssueDate\":\"2020-01-15\",\"certificateIssuePlace\":\" Cơ quan mẫu \",\"exploitationRightDescription\":\" Quyền khai thác mẫu \",\"rightType\"");
        submit(ownerToken,property,valid.replace("2020-01-15","2099-01-01")).andExpect(status().isBadRequest());
        submit(ownerToken,property,valid).andExpect(status().isCreated()).andExpect(jsonPath("$.certificateNumber").value("MAU-001")).andExpect(jsonPath("$.certificateIssuePlace").value("Cơ quan mẫu")).andExpect(jsonPath("$.localFixture").value(false));
    }
    @Test void legacyPendingPropertyWithoutDossierCanSubmitRealEvidenceWithoutReset()throws Exception{
        property.setApprovalStatus(Property.ApprovalStatus.PENDING_APPROVAL);properties.saveAndFlush(property);
        long before=property.getVersion();String file=uploadRight();String id=send(file);
        assertNotNull(dossiers.findById(Long.valueOf(id)).orElseThrow());
        assertEquals(Property.ApprovalStatus.PENDING_APPROVAL,property.getApprovalStatus());assertEquals(before,property.getVersion());
        submit(ownerToken,property,body(file,before)).andExpect(status().isConflict());
        upload(ownerToken,property,"RIGHT_DOCUMENT",png).andExpect(status().isConflict());
    }
    @Test void evidenceIsPrivateCanonicalImageAndAdminOnlyReadsSubmittedFiles()throws Exception{
        String id=uploadRight();mvc.perform(get("/api/v1/property-evidence-files/"+id)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/property-evidence-files/"+id).header("Authorization","Bearer "+token(other))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/property-evidence-files/"+id).header("Authorization","Bearer "+adminToken)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/property-evidence-files/"+id).header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(header().string("X-Content-Type-Options","nosniff")).andExpect(content().contentType("image/png"));
        assertFalse(files.findById(Long.valueOf(id)).orElseThrow().getFilename().contains("/"));send(id);
        mvc.perform(get("/api/v1/property-evidence-files/"+id).header("Authorization","Bearer "+adminToken)).andExpect(status().isOk());
    }
    @Test void fakeUnsupportedEmptyOversizedAndForeignUploadsAreRejected()throws Exception{
        upload(ownerToken,property,"RIGHT_DOCUMENT","<svg><script>alert(1)</script></svg>".getBytes()).andExpect(status().isBadRequest());
        upload(ownerToken,property,"RIGHT_DOCUMENT",new byte[0]).andExpect(status().isBadRequest());
        upload(ownerToken,property,"RIGHT_DOCUMENT",new byte[5*1024*1024+1]).andExpect(status().isBadRequest());
        upload(ownerToken,foreignProperty,"RIGHT_DOCUMENT",png).andExpect(status().isNotFound());
        upload(ownerToken,property,"BOGUS",png).andExpect(status().isBadRequest());assertEquals(0,files.countByPropertyId(property.getId()));
    }
    @Test void ownerSubmissionRequiresOwnPropertyCorrectPurposeAndVersion()throws Exception{
        String id=uploadRight();submit(ownerToken,foreignProperty,body(id,0)).andExpect(status().isNotFound());
        submit(token(other),property,body(id,0)).andExpect(status().isNotFound());
        submit(ownerToken,property,body(id,9)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_VERSION"));
        submit(ownerToken,property,body(id,0).replace("documentFileIds","supportingFileIds")).andExpect(status().isBadRequest());
        String supporting=JsonPath.read(upload(ownerToken,property,"SUPPORTING",png).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),"$.id");
        submit(ownerToken,property,body(supporting,0)).andExpect(status().isNotFound());
        submit(ownerToken,property,body(id,0).replace("\"OWNERSHIP\"","0")).andExpect(status().isBadRequest());
        submit(ownerToken,property,body(id,0).replace("\"propertyVersion\":0","\"propertyVersion\":0.9")).andExpect(status().isBadRequest());
        submit(ownerToken,property,body(id,0).replace("\"propertyVersion\":0","\"status\":\"APPROVED\",\"propertyVersion\":0")).andExpect(status().isBadRequest());
        assertTrue(dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(property.getId()).isEmpty());
    }
    @Test void submitLocksPropertyPendingAndPreventDuplicateOrSilentDocumentChanges()throws Exception{
        String file=uploadRight(),id=send(file);assertEquals(Property.ApprovalStatus.PENDING_APPROVAL,property.getApprovalStatus());
        submit(ownerToken,property,body(file,property.getVersion())).andExpect(status().isConflict());
        upload(ownerToken,property,"RIGHT_DOCUMENT",png).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/owner/properties/"+property.getId()+"/verification-dossiers").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
    }
    @Test void onlyAdminCanReviewOrReadQueueAndOwnerCannotAccessOthersDossiers()throws Exception{
        String id=send(uploadRight());for(var actor:List.of(owner,other,customer)){
            String token=token(actor);mvc.perform(get("/api/v1/admin/property-dossiers").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
            decision(token,id,"APPROVE","",0).andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/v1/owner/properties/"+property.getId()+"/verification-dossiers").header("Authorization","Bearer "+token(other))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/admin/property-dossiers").header("Authorization","Bearer "+adminToken).param("status","PENDING_APPROVAL")).andExpect(status().isOk());
    }
    @Test void additionalInformationAndResubmitKeepHistoricalDossierAndReason()throws Exception{
        String file=uploadRight(),first=send(file);decision(adminToken,first,"REQUEST_ADDITIONAL_INFORMATION","Bổ sung giấy tờ quyền khai thác",0).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NEEDS_INFORMATION"));
        assertEquals(Property.ApprovalStatus.NEEDS_INFORMATION,property.getApprovalStatus());
        String second=send(file);assertNotEquals(first,second);
        var history=dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(property.getId());assertEquals(2,history.size());
        assertEquals("Bổ sung giấy tờ quyền khai thác",history.get(1).getReviewReason());
        decision(adminToken,first,"APPROVE","",1).andExpect(status().isConflict());
        decision(adminToken,second,"APPROVE","Đã đối chiếu",0).andExpect(status().isOk());
    }
    @Test void rejectRequiresReasonAndStaleRepeatedOrForgedDecisionIsRejected()throws Exception{
        String id=send(uploadRight());decision(adminToken,id,"REJECT"," ",0).andExpect(status().isBadRequest());
        decision(adminToken,id,"APPROVE","",8).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/admin/property-dossiers/"+id+"/decisions").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"decision\":0,\"version\":0}")).andExpect(status().isBadRequest());
        decision(adminToken,id,"REJECT","Không đủ chứng từ",0).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        decision(adminToken,id,"APPROVE","",1).andExpect(status().isConflict());assertEquals(Property.ApprovalStatus.REJECTED,property.getApprovalStatus());
    }
    @Test void approvalIsPerPropertyAndPublicationIsSeparateVersionedOwnerCommand()throws Exception{
        String apartment=createApartment();publish(ownerToken,apartment,0,"PUBLISHED").andExpect(status().isConflict());
        String dossier=send(uploadRight());decision(adminToken,dossier,"APPROVE","Đã đối chiếu hồ sơ",0).andExpect(status().isOk());
        assertEquals(Property.ApprovalStatus.APPROVED,property.getApprovalStatus());assertEquals(Property.ApprovalStatus.DRAFT,foreignProperty.getApprovalStatus());
        mvc.perform(get("/api/v1/apartments/"+apartment)).andExpect(status().isNotFound());
        publish(token(other),apartment,0,"PUBLISHED").andExpect(status().isNotFound());
        publish(ownerToken,apartment,5,"PUBLISHED").andExpect(status().isConflict());
        publish(ownerToken,apartment,0,"PUBLISHED").andExpect(status().isOk()).andExpect(jsonPath("$.availability").value("VACANT")).andExpect(jsonPath("$.version").value(1));
        var publicResult=mvc.perform(get("/api/v1/apartments/"+apartment)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertFalse(publicResult.contains("1234567890"));assertFalse(publicResult.contains("documentFileIds"));assertFalse(publicResult.contains("reviewReason"));
        publish(ownerToken,apartment,1,"HIDDEN").andExpect(status().isOk()).andExpect(jsonPath("$.availability").value("VACANT"));
        mvc.perform(get("/api/v1/apartments/"+apartment)).andExpect(status().isNotFound());
    }
}
