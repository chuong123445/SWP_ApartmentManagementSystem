package com.ancu.proptech.service.ai;
import com.ancu.proptech.model.ai.AssistanceRun;
import com.ancu.proptech.repository.ai.AssistanceRunRepository;
import com.ancu.proptech.config.property.DossierAiSettings;
import com.ancu.proptech.service.property.ai.DossierAiReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
@Service @RequiredArgsConstructor
public class AssistanceAudit {
 private final AssistanceRunRepository runs;private final DossierAiSettings settings;
 @Transactional(propagation=Propagation.REQUIRES_NEW) public AssistanceRun start(String task,Long account,Long property,String source,String prompt){
  return create(task,account,property,hash(source),prompt);
 }
 @Transactional(propagation=Propagation.REQUIRES_NEW) public AssistanceRun startHashed(String task,Long account,Long property,String sourceHash,String prompt){return create(task,account,property,sourceHash,prompt);}
 private AssistanceRun create(String task,Long account,Long property,String sourceHash,String prompt){var r=new AssistanceRun();r.setId(UUID.randomUUID().toString());r.setTask(task);r.setAccountId(account);r.setPropertyId(property);r.setSourceHash(sourceHash);r.setModel(settings.getModel().isBlank()?"NOT_CONFIGURED":settings.getModel());r.setPromptVersion(prompt);r.setStatus("RUNNING");r.setCreatedAt(Instant.now());return runs.saveAndFlush(r);}
 @Transactional(propagation=Propagation.REQUIRES_NEW) public void finish(String id,String result,String error){var r=runs.findById(id).orElseThrow();r.setStatus(error==null?"COMPLETED":"FAILED");r.setResultJson(result);r.setErrorCode(error);r.setFinishedAt(Instant.now());runs.saveAndFlush(r);}
 public static String hash(String source){return DossierAiReviewService.hash(source.getBytes(StandardCharsets.UTF_8));}
}
