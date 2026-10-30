package com.ancu.proptech.controller.finance;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class CashEntryIntegrationTests {
    private static final String URL="/api/v1/owner/cash-entries";
    @Autowired MockMvc mvc;
    @Autowired AuthAccountRepository accounts;
    @Autowired PropertyRepository properties;
    @Autowired PasswordEncoder encoder;
    @Autowired AuthService auth;
    private AuthAccount account(AuthAccount.Role role) {
        var a=new AuthAccount();a.setEmail(com.ancu.proptech.support.TestIds.next()+"@example.invalid");
        a.setFullName("Kiểm thử sổ quỹ");a.setPasswordHash(encoder.encode("Test!12345678"));a.setRole(role);
        a.setStatus(AuthAccount.Status.ACTIVE);a.setEmailVerified(true);a.setContactVerified(true);return accounts.saveAndFlush(a);
    }
    private String token(AuthAccount a){return "Bearer "+auth.login(a.getEmail(),"Test!12345678").tokens().accessToken();}
    private Property property(AuthAccount owner) {
        var p=new Property();p.setOwner(owner);p.setName("Tòa kiểm thử sổ quỹ");p.setAddress("Địa chỉ thử");
        p.setCity("Test");p.setDistrict("Test");p.setApprovalStatus(Property.ApprovalStatus.APPROVED);return properties.saveAndFlush(p);
    }
    private String body(Long property,String key,String direction,String amount,String date) {
        return """
            {"propertyId":%d,"requestKey":"%s","direction":"%s","paymentMethod":"BANK_TRANSFER",
            "amount":"%s","transactionDate":"%s","category":"Thu chi khác","counterparty":"Người thử",
            "description":"Giao dịch kiểm thử","reference":"TEST-001"}
            """.formatted(property,key,direction,amount,date);
    }
    private long create(String token,Property p,String direction,String amount,String date)throws Exception {
        String json=mvc.perform(post(URL).header("Authorization",token).contentType("application/json")
            .content(body(p.getId(),UUID.randomUUID().toString(),direction,amount,date)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT"))
            .andReturn().getResponse().getContentAsString();
        return ((Number)com.jayway.jsonpath.JsonPath.read(json,"$.id")).longValue();
    }
    private void postEntry(String token,long id)throws Exception {
        mvc.perform(post(URL+"/"+id+"/post").header("Authorization",token).contentType("application/json").content("{\"version\":0}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("POSTED"));
    }
    @Test void privateOwnershipAndRoleAreEnforced()throws Exception {
        var owner=account(AuthAccount.Role.OWNER);var other=account(AuthAccount.Role.OWNER);
        var customer=account(AuthAccount.Role.CUSTOMER);var p=property(owner);String t=token(owner),o=token(other);
        long id=create(t,p,"INCOME","100.25","2020-01-05");
        mvc.perform(get(URL+"?month=2020-01")).andExpect(status().isUnauthorized());
        mvc.perform(get(URL+"?month=2020-01").header("Authorization",token(customer))).andExpect(status().isForbidden());
        mvc.perform(get(URL+"?month=2020-01").header("Authorization",o)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(URL+"/"+id).header("Authorization",o)).andExpect(status().isNotFound());
        mvc.perform(post(URL+"/"+id+"/post").header("Authorization",o).contentType("application/json").content("{\"version\":0}")).andExpect(status().isNotFound());
        mvc.perform(post(URL).header("Authorization",o).contentType("application/json").content(body(p.getId(),UUID.randomUUID().toString(),"INCOME","100","2020-01-05"))).andExpect(status().isNotFound());
        mvc.perform(get(URL+"/summary?month=2020-01&propertyId="+p.getId()).header("Authorization",o)).andExpect(status().isNotFound());
        mvc.perform(get(URL+"/"+id).header("Authorization",t)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
    }
    @Test void totalsUseAllPostedRowsAndRespectDatePropertyAndDirection()throws Exception {
        var owner=account(AuthAccount.Role.OWNER);var p=property(owner);var p2=property(owner);String t=token(owner);
        postEntry(t,create(t,p,"INCOME","1000.25","2020-01-01"));
        postEntry(t,create(t,p,"EXPENSE","100.10","2020-01-31"));
        create(t,p,"INCOME","99999","2020-01-15");
        postEntry(t,create(t,p,"INCOME","200","2020-02-01"));
        postEntry(t,create(t,p2,"INCOME","50","2020-01-15"));
        String query="?month=2020-01&propertyId="+p.getId();
        mvc.perform(get(URL+query+"&size=1").header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.items",hasSize(1))).andExpect(jsonPath("$.totalElements").value(3));
        mvc.perform(get(URL+"/summary"+query).header("Authorization",t)).andExpect(status().isOk())
            .andExpect(jsonPath("$.income").value("1000.25")).andExpect(jsonPath("$.expense").value("100.10"))
            .andExpect(jsonPath("$.netCashflow").value("900.15")).andExpect(jsonPath("$.postedCount").value(2));
        mvc.perform(get(URL+"/summary"+query+"&direction=EXPENSE").header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.income").value("0"));
        mvc.perform(get(URL+"/summary?month=2020-01").header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.income").value("1050.25"));
    }
    @Test void duplicateRetryCannotChangeContentsAndCancellationRetainsAudit()throws Exception {
        var owner=account(AuthAccount.Role.OWNER);var p=property(owner);String t=token(owner);
        String b=body(p.getId(),UUID.randomUUID().toString(),"INCOME","100.25","2020-01-05");
        var json=mvc.perform(post(URL).header("Authorization",t).contentType("application/json").content(b)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id=((Number)com.jayway.jsonpath.JsonPath.read(json,"$.id")).longValue();
        mvc.perform(post(URL).header("Authorization",t).contentType("application/json").content(b)).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        mvc.perform(post(URL).header("Authorization",t).contentType("application/json").content(b.replace("100.25","200.25"))).andExpect(status().isConflict());
        postEntry(t,id);
        mvc.perform(post(URL+"/"+id+"/post").header("Authorization",t).contentType("application/json").content("{\"version\":0}")).andExpect(status().isConflict());
        mvc.perform(post(URL+"/"+id+"/cancel").header("Authorization",t).contentType("application/json").content("{\"version\":1,\"reason\":\"Ghi nhầm số tiền\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(jsonPath("$.postedAt").isNotEmpty())
            .andExpect(jsonPath("$.cancelledBy").value(owner.getId())).andExpect(jsonPath("$.cancellationReason").value("Ghi nhầm số tiền"));
        mvc.perform(get(URL+"/summary?month=2020-01").header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.postedCount").value(0));
        mvc.perform(post(URL+"/"+id+"/post").header("Authorization",t).contentType("application/json").content("{\"version\":2}")).andExpect(status().isConflict());
    }
    @Test void invalidAmountsDatesVersionsAndPaginationAreRejected()throws Exception {
        var owner=account(AuthAccount.Role.OWNER);var p=property(owner);String t=token(owner);
        for(String amount:new String[]{"0","-1","1.001","10000000000000"})
            mvc.perform(post(URL).header("Authorization",t).contentType("application/json").content(body(p.getId(),UUID.randomUUID().toString(),"EXPENSE",amount,"2020-01-01"))).andExpect(status().isBadRequest());
        mvc.perform(post(URL).header("Authorization",t).contentType("application/json").content(body(p.getId(),UUID.randomUUID().toString(),"EXPENSE","10","2099-01-01"))).andExpect(status().isBadRequest());
        mvc.perform(get(URL+"?month=2020-13").header("Authorization",t)).andExpect(status().isBadRequest());
        mvc.perform(get(URL+"?month=2020-01&size=0").header("Authorization",t)).andExpect(status().isBadRequest());
        long id=create(t,p,"EXPENSE","10","2020-01-01");
        mvc.perform(post(URL+"/"+id+"/post").header("Authorization",t).contentType("application/json").content("{}")) .andExpect(status().isBadRequest());
        mvc.perform(post(URL+"/"+id+"/cancel").header("Authorization",t).contentType("application/json").content("{\"version\":0,\"reason\":\" \"}")) .andExpect(status().isBadRequest());
    }
}
