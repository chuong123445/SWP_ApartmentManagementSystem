package com.ancu.proptech.service.property;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.*;
@Service @RequiredArgsConstructor
public class PropertyRightNoticeService {
    private final PropertyRepository properties;private final PropertyRightNoticeRepository notices;private final AuthAccountRepository accounts;
    private final PropertyRightsPolicy rights;private final AccountAccessService access;private final TransactionTemplate transactions;private final PropertyNoticeEmailSender email;
    public record Notice(UUID id,UUID propertyId,String propertyName,String kind,LocalDate expiresOn,Instant createdAt){}
    private record Delivery(UUID id,String destination,String propertyName,LocalDate expiresOn,boolean expired,int attempt){}
    @Transactional(readOnly=true) public List<Notice> mine(Jwt jwt){var a=access.account(jwt);return notices.findByRecipientIdOrderByCreatedAtDescIdDesc(a.getId(),PageRequest.of(0,100)).stream().map(n->new Notice(n.getId(),n.getProperty().getId(),n.getProperty().getName(),n.getKind(),n.getExpiresOn(),n.getCreatedAt())).toList();}
    public void generate(LocalDate today){
        var ids=properties.rightsDue(today.plusDays(30));
        for(UUID id:ids)transactions.executeWithoutResult(status->{
            var p=properties.lockById(id).orElseThrow();
            if(p.getApprovalStatus()!=Property.ApprovalStatus.APPROVED||!rights.limited(p)||p.getApprovedRightsDossierId()==null||p.getRightsValidUntil()==null)return;
            String kind=p.getRightsValidUntil().isBefore(today)?"EXPIRED":"EXPIRING";
            if(p.getRightsValidUntil().isAfter(today.plusDays(30))||notices.existsByDossierIdAndKind(p.getApprovedRightsDossierId(),kind))return;
            var n=new PropertyRightNotice();n.setProperty(p);n.setRecipientId(p.getOwner().getId());n.setDossierId(p.getApprovedRightsDossierId());n.setKind(kind);n.setExpiresOn(p.getRightsValidUntil());n.setCreatedAt(Instant.now());
            n.setEmailDestination(p.getOwner().isEmailVerified()?p.getOwner().getEmail():null);n.setEmailStatus(n.getEmailDestination()==null?"SKIPPED":"PENDING");n.setNextAttemptAt(Instant.now());notices.saveAndFlush(n);
        });
    }
    public void deliver(){
        if(!email.isConfigured())return;
        for(UUID id:notices.due(Instant.now(),PageRequest.of(0,20))){
            Delivery delivery=transactions.execute(status->{
                var n=notices.lockById(id).orElseThrow();if(!Set.of("PENDING","RETRY","SENDING").contains(n.getEmailStatus())||n.getNextAttemptAt().isAfter(Instant.now()))return null;
                if(n.getAttempts()>=5){n.setEmailStatus("FAILED");return null;}
                var a=accounts.findById(n.getRecipientId()).orElseThrow();var p=n.getProperty();
                if(a.getStatus()!=com.ancu.proptech.model.auth.AuthAccount.Status.ACTIVE||!a.isEmailVerified()||!Objects.equals(a.getEmail(),n.getEmailDestination())||!Objects.equals(p.getApprovedRightsDossierId(),n.getDossierId())||!Objects.equals(p.getRightsValidUntil(),n.getExpiresOn())){n.setEmailStatus("SKIPPED");return null;}
                n.setEmailStatus("SENDING");n.setAttempts(n.getAttempts()+1);n.setNextAttemptAt(Instant.now().plusSeconds(600));
                return new Delivery(id,n.getEmailDestination(),p.getName(),n.getExpiresOn(),n.getKind().equals("EXPIRED"),n.getAttempts());
            });
            if(delivery==null)continue;
            boolean success;try{email.send(delivery.destination(),delivery.propertyName(),delivery.expiresOn(),delivery.expired());success=true;}catch(RuntimeException e){success=false;}
            boolean sent=success;transactions.executeWithoutResult(status->{var n=notices.lockById(id).orElseThrow();if(n.getAttempts()!=delivery.attempt())return;n.setEmailStatus(sent?"SENT":n.getAttempts()>=5?"FAILED":"RETRY");n.setNextAttemptAt(Instant.now().plusSeconds(1800L*n.getAttempts()));});
        }
    }
}
