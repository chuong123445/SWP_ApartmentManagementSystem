package com.ancu.proptech.service.property.ai;
import tools.jackson.databind.JsonNode;
import java.util.*;
import java.util.stream.Collectors;
import static com.ancu.proptech.service.property.ai.DossierAiClient.Failure;

public record DossierAiReport(String verdict,String summary,List<FileReview> files,List<Finding> overallFindings) {
    public record Extraction(String field,String value){}
    public record Finding(String type,String field,String message,String declaredValue,String observedValue){}
    public record FileReview(String fileId,boolean readable,String documentType,List<Extraction> extractedFields,List<Finding> findings){}
    private static final Set<String> FIELDS=Set.of("propertyName","propertyAddress","applicantName","applicantDocumentNumber","principalName","principalDocumentNumber","certificateNumber","certificateIssueDate","certificateIssuePlace","rightsValidFrom","rightsValidUntil","originalLeaseFrom","originalLeaseUntil","bank","accountNumber","accountHolderName","other");
    private static final Set<String> TYPES=Set.of("MISSING_INFORMATION","MISSING_IMAGE","MISMATCH","UNREADABLE","INCONCLUSIVE");
    public static FileReview parse(JsonNode node,String expectedId){
        if(!node.isObject() || !text(node,"fileId",30).equals(expectedId) || !node.path("readable").isBoolean())throw invalid();
        var fields=node.path("extractedFields");var findings=node.path("findings");
        if(!fields.isArray()||fields.size()>30||!findings.isArray()||findings.size()>15)throw invalid();
        var extracts=new ArrayList<Extraction>();var issues=new ArrayList<Finding>();
        for(var f:fields){String field=text(f,"field",50);if(!FIELDS.contains(field))throw invalid();extracts.add(new Extraction(field,text(f,"value",500)));}
        for(var f:findings){String type=text(f,"type",40),field=text(f,"field",50);if(!TYPES.contains(type)||!FIELDS.contains(field))throw invalid();
            String message=text(f,"message",1000);if(message.isBlank())throw invalid();
            String observed=text(f,"observedValue",500);if(type.equals("MISMATCH")&&observed.isBlank())throw invalid();
            issues.add(new Finding(type,field,message,text(f,"declaredValue",500),observed));}
        return new FileReview(expectedId,node.path("readable").asBoolean(),text(node,"documentType",120),List.copyOf(extracts),List.copyOf(issues));
    }
    private static String text(JsonNode node,String field,int max){var value=node.path(field);if(!value.isString()||value.asString().length()>max)throw invalid();return value.asString();}
    public static DossierAiReport aggregate(List<FileReview> files){
        if(files.isEmpty())throw new Failure("INVALID_SOURCE",false);
        var overall=new ArrayList<Finding>();
        // Chỉ đối chiếu chéo các mã định danh; không ép địa chỉ/tên viết khác định dạng phải bằng nhau.
        for(String key:List.of("applicantDocumentNumber","principalDocumentNumber","certificateNumber","accountNumber")){
            var values=files.stream().flatMap(f->f.extractedFields().stream()).filter(e->e.field().equals(key)&&!e.value().isBlank())
                .map(e->e.value().replaceAll("[^\\p{L}\\p{N}]","").toUpperCase(Locale.ROOT)).collect(Collectors.toSet());
            if(values.size()>1)overall.add(new Finding("MISMATCH",key,"Các tệp đọc được có giá trị khác nhau cho trường này; admin cần đối chiếu bản gốc.","",String.join(" / ",values)));
        }
        boolean issues=!overall.isEmpty()||files.stream().flatMap(f->f.findings().stream()).anyMatch(f->Set.of("MISSING_INFORMATION","MISSING_IMAGE","MISMATCH").contains(f.type()));
        boolean unsure=files.stream().anyMatch(f->!f.readable()||f.extractedFields().stream().noneMatch(e->!e.field().equals("other")&&!e.value().isBlank())||!f.findings().isEmpty());
        String verdict=issues?"ISSUES_FOUND":unsure?"INCONCLUSIVE":"CONSISTENT";
        String summary=issues?"Có thông tin hoặc chứng từ cần admin đối chiếu/bổ sung.":unsure?"Chưa đủ dữ liệu đọc được để kết luận đối chiếu.":"Chưa phát hiện thiếu hoặc không khớp trong các tệp đã đọc; admin vẫn cần kiểm tra bản gốc.";
        return new DossierAiReport(verdict,summary,List.copyOf(files),List.copyOf(overall));
    }
    private static Failure invalid(){return new Failure("INVALID_RESPONSE",false);}
}
