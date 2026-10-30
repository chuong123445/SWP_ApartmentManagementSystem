package com.ancu.proptech.service.property.ai;

import com.ancu.proptech.config.property.DossierAiSettings;
import com.ancu.proptech.model.property.DossierAiReview;
import com.ancu.proptech.repository.property.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import static com.ancu.proptech.service.property.ai.DossierAiClient.Failure;

@Service @RequiredArgsConstructor
public class DossierAiWorker {
    private final DossierAiReviewRepository reviews;
    private final PropertyEvidenceContentRepository contents;
    private final DossierAiClient client;
    private final DossierAiSettings settings;
    private final PlatformTransactionManager transactionManager;
    private final ObjectMapper json;
    private final jakarta.persistence.EntityManager entities;
    private static final List<DossierAiReview.State> ELIGIBLE=List.of(DossierAiReview.State.QUEUED,DossierAiReview.State.WAITING_CONFIGURATION);
    private record Claim(Long dossierId,String token,String source,String hash){}
    private <T>T tx(Supplier<T> work){return new TransactionTemplate(transactionManager).execute(status->work.get());}

    // Chỉ scheduler gọi phương thức này. Giao dịch claim/ghi kết quả ngắn, HTTP nằm ở giữa, ngoài giao dịch.
    public boolean runOnce(){
        if(!settings.configured())return false;
        Claim claim=tx(()->{
            Instant now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS),cutoff=now.minus(Duration.ofMinutes(30));
            reviews.findFirstByStateAndStartedAtBeforeOrderByStartedAtAsc(DossierAiReview.State.RUNNING,cutoff).ifPresent(old->{
                var r=reviews.lockByDossierId(old.getDossierId()).orElseThrow();entities.refresh(r);
                if(r.getState()==DossierAiReview.State.RUNNING&&r.getStartedAt().isBefore(cutoff)){
                    r.setState(r.getAttempts()<3?DossierAiReview.State.QUEUED:DossierAiReview.State.FAILED);r.setRunToken(null);r.setErrorCode("WORKER_INTERRUPTED");r.setNextAttemptAt(now);
                    if(r.getState()==DossierAiReview.State.FAILED)r.setFinishedAt(now);reviews.saveAndFlush(r);
                }
            });
            var next=reviews.findFirstByStateInAndNextAttemptAtLessThanEqualOrderByCreatedAtAscIdAsc(ELIGIBLE,now);if(next.isEmpty())return null;
            var r=reviews.lockByDossierId(next.get().getDossierId()).orElseThrow();entities.refresh(r);
            if(!ELIGIBLE.contains(r.getState())||r.getNextAttemptAt().isAfter(now))return null;
            String token=UUID.randomUUID().toString();r.setState(DossierAiReview.State.RUNNING);r.setRunToken(token);r.setStartedAt(now);r.setFinishedAt(null);r.setErrorCode(null);r.setModel(settings.getModel());r.setAttempts(r.getAttempts()+1);reviews.saveAndFlush(r);
            return new Claim(r.getDossierId(),token,r.getSourceJson(),r.getSourceHash());
        });
        if(claim==null)return false;
        try{
            if(!DossierAiReviewService.hash(claim.source().getBytes(StandardCharsets.UTF_8)).equals(claim.hash()))throw new Failure("INVALID_SOURCE",false);
            var source=json.readTree(claim.source());var manifest=source.path("files");
            if(!manifest.isArray()||manifest.isEmpty()||manifest.size()>20)throw new Failure("INVALID_SOURCE",false);
            var result=new ArrayList<DossierAiReport.FileReview>();
            for(var file:manifest){
                if(!Boolean.TRUE.equals(tx(()->reviews.findByDossierId(claim.dossierId()).map(r->current(r,claim)).orElse(false))))return true;
                var document=tx(()->document(file));
                result.add(client.analyze(source.path("fields"),document));
            }
            String output=json.writeValueAsString(DossierAiReport.aggregate(result));
            tx(()->{var r=reviews.lockByDossierId(claim.dossierId()).orElseThrow();entities.refresh(r);if(current(r,claim)){r.setResultJson(output);r.setState(DossierAiReview.State.COMPLETED);r.setErrorCode(null);r.setRunToken(null);r.setFinishedAt(Instant.now());reviews.saveAndFlush(r);}return null;});
        }catch(Failure e){fail(claim,e);}catch(RuntimeException e){fail(claim,new Failure("PROCESSING_FAILED",false));}
        return true;
    }
    private DossierAiClient.Document document(JsonNode file){
        String id=file.path("id").asString();var bytes=contents.findById(Long.valueOf(id)).orElseThrow(()->new Failure("INVALID_SOURCE",false)).getContent();
        if(!DossierAiReviewService.hash(bytes).equals(file.path("sha256").asString()))throw new Failure("INVALID_SOURCE",false);
        return new DossierAiClient.Document(id,file.path("purpose").asString(),file.path("mimeType").asString(),file.path("filename").asString(),bytes);
    }
    private boolean current(DossierAiReview r,Claim claim){return r.getState()==DossierAiReview.State.RUNNING&&claim.token().equals(r.getRunToken());}
    private void fail(Claim claim,Failure failure){
        tx(()->{
            var r=reviews.lockByDossierId(claim.dossierId()).orElseThrow();entities.refresh(r);if(!current(r,claim))return null;
            boolean retry=failure.retryable&&r.getAttempts()<3;
            r.setErrorCode(failure.code.matches("[A-Z_]{1,40}")?failure.code:"PROCESSING_FAILED");r.setRunToken(null);r.setResultJson(null);
            r.setState(retry?DossierAiReview.State.QUEUED:DossierAiReview.State.FAILED);r.setNextAttemptAt(Instant.now().plusSeconds(60L*r.getAttempts()));if(!retry)r.setFinishedAt(Instant.now());reviews.saveAndFlush(r);return null;
        });
    }
}
