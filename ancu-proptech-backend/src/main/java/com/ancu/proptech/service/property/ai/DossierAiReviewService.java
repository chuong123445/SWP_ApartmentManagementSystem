package com.ancu.proptech.service.property.ai;

import com.ancu.proptech.config.property.DossierAiSettings;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class DossierAiReviewService {
    public static final String PROMPT_VERSION="dossier-review-v1";
    private final DossierAiReviewRepository reviews;
    private final PropertyDossierRepository dossiers;
    private final PropertyEvidenceContentRepository contents;
    private final AccountAccessService access;
    private final DossierAiSettings settings;
    private final ObjectMapper json;
    public record View(String status,String sourceHash,String model,String promptVersion,int attempts,
        Instant createdAt,Instant startedAt,Instant finishedAt,String errorCode,long version,JsonNode result) {}

    // Gọi trong transaction nộp hồ sơ. Chỉ xếp hàng, không gọi dịch vụ AI ở đây.
    @Transactional public void enqueue(PropertyDossier dossier){
        if(reviews.findByDossierId(dossier.getId()).isPresent())return;
        var fields=new LinkedHashMap<String,Object>();var p=dossier.getProperty();
        fields.put("propertyName",p.getName());fields.put("propertyAddress",p.getAddress());fields.put("city",p.getCity());fields.put("district",p.getDistrict());fields.put("ward",p.getWard());
        fields.put("rightType",dossier.getRightType().name());fields.put("applicantName",dossier.getApplicantName());fields.put("applicantDocumentNumber",dossier.getApplicantDocumentNumber());
        fields.put("principalName",dossier.getPrincipalName());fields.put("principalDocumentNumber",dossier.getPrincipalDocumentNumber());
        fields.put("certificateNumber",dossier.getCertificateNumber());fields.put("certificateIssueDate",dossier.getCertificateIssueDate());fields.put("certificateIssuePlace",dossier.getCertificateIssuePlace());
        fields.put("exploitationRightDescription",dossier.getExploitationRightDescription());fields.put("rightsValidFrom",dossier.getRightsValidFrom());fields.put("rightsValidUntil",dossier.getRightsValidUntil());
        fields.put("originalLeaseFrom",dossier.getOriginalLeaseFrom());fields.put("originalLeaseUntil",dossier.getOriginalLeaseUntil());
        fields.put("bank",dossier.getBank());fields.put("accountNumber",dossier.getAccountNumber());fields.put("accountHolderName",dossier.getAccountHolderName());
        var manifest=new ArrayList<Map<String,Object>>();
        for(var file:dossier.getFiles()){
            var bytes=contents.findById(file.getId()).orElseThrow(()->new IllegalStateException("Missing submitted evidence content")).getContent();
            manifest.add(Map.of("id",file.getId().toString(),"purpose",file.getPurpose().name(),"mimeType",file.getContentType(),"filename",file.getFilename(),"sha256",hash(bytes)));
        }
        String source=json.writeValueAsString(Map.of("fields",fields,"files",manifest));
        var r=new DossierAiReview();r.setDossierId(dossier.getId());r.setSourceJson(source);r.setSourceHash(hash(source.getBytes(StandardCharsets.UTF_8)));r.setPromptVersion(PROMPT_VERSION);
        r.setState(settings.configured()?DossierAiReview.State.QUEUED:DossierAiReview.State.WAITING_CONFIGURATION);r.setCreatedAt(Instant.now());r.setNextAttemptAt(Instant.now());reviews.saveAndFlush(r);
    }
    @Transactional(readOnly=true) public View read(Jwt jwt,Long dossierId){
        access.admin(jwt);if(!dossiers.existsById(dossierId))throw missing();
        return reviews.findByDossierId(dossierId).map(this::view).orElse(new View("NOT_REQUESTED",null,null,PROMPT_VERSION,0,null,null,null,null,0,null));
    }
    @Transactional public View retry(Jwt jwt,Long dossierId,long version){
        access.admin(jwt);var dossier=dossiers.lockById(dossierId).orElseThrow(DossierAiReviewService::missing);
        var optional=reviews.lockByDossierId(dossierId);
        if(optional.isEmpty()){if(version!=0)throw stale();enqueue(dossier);return view(reviews.findByDossierId(dossierId).orElseThrow());}
        var r=optional.get();if(r.getVersion()!=version)throw stale();
        if(r.getState()==DossierAiReview.State.RUNNING || r.getState()==DossierAiReview.State.QUEUED)throw new ApiException(HttpStatus.CONFLICT,"AI_ALREADY_RUNNING","Hồ sơ đang được xếp hàng hoặc quét.");
        r.setState(settings.configured()?DossierAiReview.State.QUEUED:DossierAiReview.State.WAITING_CONFIGURATION);r.setResultJson(null);r.setErrorCode(null);r.setStartedAt(null);r.setFinishedAt(null);r.setRunToken(null);r.setAttempts(0);r.setNextAttemptAt(Instant.now());reviews.saveAndFlush(r);return view(r);
    }
    private View view(DossierAiReview r){return new View(r.getState().name(),r.getSourceHash(),r.getModel(),r.getPromptVersion(),r.getAttempts(),r.getCreatedAt(),r.getStartedAt(),r.getFinishedAt(),r.getErrorCode(),r.getVersion(),r.getResultJson()==null?null:json.readTree(r.getResultJson()));}
    public static String hash(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hồ sơ.");}
    private static ApiException stale(){return new ApiException(HttpStatus.CONFLICT,"STALE_VERSION","Lượt quét đã thay đổi. Hãy tải lại.");}
}
