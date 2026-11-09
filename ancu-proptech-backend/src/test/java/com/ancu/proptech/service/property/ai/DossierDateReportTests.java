package com.ancu.proptech.service.property.ai;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class DossierDateReportTests {
    private final JsonMapper json=JsonMapper.builder().build();

    @Test void equivalentIsoAndVietnameseDatesDoNotProduceMismatch(){
        var report=Map.of("fileId","7","readable",true,"documentType","Certificate",
                "extractedFields",List.of(Map.of("field","certificateIssueDate","value","15/12/2025"),Map.of("field","city","value","TP. Hồ Chí Minh")),
                "findings",List.of(Map.of("type","MISMATCH","field","certificateIssueDate","message","Ngày khác nhau","declaredValue","2025-12-15","observedValue","15/12/2025")));
        var parsed=DossierAiReport.parse(json.valueToTree(report),"7");
        assertTrue(parsed.findings().isEmpty());assertEquals("2025-12-15",parsed.extractedFields().getFirst().value());
    }
    @Test void datesHaveFixedDayMonthMeaning(){
        assertEquals("2026-06-05",DossierDateValues.normalize("rightsValidFrom","05/06/2026"));
        assertEquals("31/02/2026",DossierDateValues.normalize("rightsValidFrom","31/02/2026"));
        assertEquals("12/31/2026",DossierDateValues.normalize("rightsValidUntil","12/31/2026"));
    }
    @Test void ownershipHasNoSeparatePrincipalAndAuthorizationCertificateDoesNotRequireApplicant(){
        var report=new DossierAiReport.FileReview("7",true,"Certificate",List.of(),List.of(
                new DossierAiReport.Finding("MISSING_INFORMATION","principalName","Thiếu chủ gốc","",""),
                new DossierAiReport.Finding("MISSING_INFORMATION","applicantName","Thiếu người nộp","","")));
        var owner=DossierAiReport.relevant(report,json.readTree("{\"rightType\":\"OWNERSHIP\"}"),"RIGHT_DOCUMENT");
        assertEquals("applicantName",owner.findings().getFirst().field());
        var authorized=DossierAiReport.relevant(report,json.readTree("{\"rightType\":\"AUTHORIZATION\"}"),"RIGHT_DOCUMENT");
        assertEquals("principalName",authorized.findings().getFirst().field());
        var mismatch=new DossierAiReport.FileReview("7",true,"Certificate",List.of(),List.of(
                new DossierAiReport.Finding("MISMATCH","applicantName","Tên không khớp","A","B")));
        assertEquals(1,DossierAiReport.relevant(mismatch,json.readTree("{\"rightType\":\"AUTHORIZATION\"}"),"RIGHT_DOCUMENT").findings().size());
    }
}
