package com.ancu.proptech.service.rental;
import static com.ancu.proptech.dto.rental.SelectionCancellationDtos.*;
import com.ancu.proptech.model.rental.*;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.rental.*;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.property.ai.DossierAiReviewService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service @RequiredArgsConstructor
public class SelectionCancellationService {
 private final RentalRequestRepository requests;private final ContractDraftRepository drafts;private final RentalContractRepository contracts;
 private final ApartmentRepository apartments;private final SelectionCancellationRepository cancellations;private final SelectionCancellationEventRepository events;
 private final AccountAccessService access;private final ObjectMapper json;private final jakarta.persistence.EntityManager entities;
 private record Selection(RentalRequest request,ContractDraft draft,RentalContract contract,SelectionCancellation cancellation){}
 @Transactional(readOnly=true) public View get(Jwt jwt,Long id){var actor=access.account(jwt);return view(load(actor,id,false),actor.getId());}
 @Transactional public View act(Jwt jwt,Long id,Command command){
  var actor=access.account(jwt);var s=load(actor,id,true);var r=s.request();var root=s.cancellation();String reason=clean(command.reason());
  if(repeated(root,actor.getId(),command.action(),reason))return view(s,actor.getId());
  if(!version(s).equals(command.sourceVersion()))throw conflict("STALE_VERSION","Dữ liệu hoặc chữ ký đã thay đổi. Hãy tải lại trước khi xử lý.");
  if(!eligible(s))throw conflict("CANCELLATION_UNAVAILABLE","Chỉ hủy lựa chọn thuê đầu đang làm hợp đồng và chưa đủ hai chữ ký. Hợp đồng có hiệu lực cần quy trình kết thúc riêng.");
  String before=json.writeValueAsString(snapshot(s));String action;
  if(command.action()==Action.START){
   if(reason==null)throw bad("Cần nhập lý do hủy hoặc đề nghị hủy.");
   if(root!=null&&root.getState()==SelectionCancellation.State.PENDING)throw conflict("CANCELLATION_PENDING","Đang có đề nghị hủy chờ phản hồi.");
   if(root==null){root=new SelectionCancellation();root.setRequestId(id);root.setCreatedAt(now());}
   root.setProposerId(actor.getId());root.setReason(reason);root.setResponderId(null);root.setResponseReason(null);
   if(signatureCount(s)==0){finish(s,reason);root.setState(SelectionCancellation.State.CANCELLED);action="DIRECT_CANCELLED";}
   else {root.setState(SelectionCancellation.State.PENDING);action="PROPOSED";}
  }else{
   if(root==null||root.getState()!=SelectionCancellation.State.PENDING)throw conflict("NO_PENDING_CANCELLATION","Không có đề nghị hủy đang chờ phản hồi.");
   boolean proposer=actor.getId().equals(root.getProposerId());
   if(command.action()==Action.WITHDRAW){if(!proposer)throw forbidden();root.setState(SelectionCancellation.State.WITHDRAWN);action="WITHDRAWN";}
   else {if(proposer)throw forbidden();if(command.action()==Action.REJECT){if(reason==null)throw bad("Cần nhập lý do từ chối đề nghị hủy.");root.setState(SelectionCancellation.State.REJECTED);action="REJECTED";}
    else {finish(s,root.getReason());root.setState(SelectionCancellation.State.CANCELLED);action="ACCEPTED";}}
   root.setResponderId(actor.getId());root.setResponseReason(reason);
  }
  root.setUpdatedAt(now());root=cancellations.saveAndFlush(root);entities.flush();
  var after=new Selection(r,s.draft(),s.contract(),root);
  var event=new SelectionCancellationEvent();event.setRequestId(id);event.setActorId(actor.getId());event.setActorName(actor.getFullName());event.setAction(action);event.setReason(reason);event.setCreatedAt(root.getUpdatedAt());event.setBeforeJson(before);event.setAfterJson(json.writeValueAsString(snapshot(after)));events.saveAndFlush(event);
  // Only an unsigned, never-effective initial draft can be removed. The request and
  // cancellation event retain the reason and before/after audit independently.
  if(root.getState()==SelectionCancellation.State.CANCELLED&&s.contract()!=null&&signatureCount(s)==0){
   drafts.delete(s.draft());drafts.flush();contracts.delete(s.contract());contracts.flush();
   after=new Selection(r,null,null,root);
  }
  return view(after,actor.getId());
 }
 private Selection load(AuthAccount actor,Long id,boolean lock){
  var r=requests.findById(id).orElseThrow(SelectionCancellationService::missing);party(r,actor.getId());
  if(lock){r=requests.findForOwnerUpdate(id,r.getApartment().getProperty().getOwner().getId()).orElseThrow(SelectionCancellationService::missing);entities.refresh(r);party(r,actor.getId());}
  else entities.refresh(r);
  entities.refresh(r.getApartment());
  var d=drafts.findByRentalRequestId(id).orElse(null);RentalContract c=d==null?null:d.getContract();
  if(c!=null&&lock){c=contracts.lockById(c.getId()).orElseThrow(SelectionCancellationService::missing);entities.refresh(c);entities.refresh(d);}
  else if(c!=null){entities.refresh(c);entities.refresh(d);}
  var cancellation=cancellations.findById(id).orElse(null);if(cancellation!=null)entities.refresh(cancellation);
  return new Selection(r,d,c,cancellation);
 }
 private void finish(Selection s,String reason){
  var r=s.request();var id=r.getApartment().getId();
  // Preflight while only the parent/contract locks are held. Other accept/create
  // commands still see CONTRACT_IN_PROGRESS, so none can claim this selection.
  if(contracts.findByApartmentId(id).stream().anyMatch(c->(s.contract()==null||!c.getId().equals(s.contract().getId()))&&c.isOpen())||requests.countOtherLiveAccepted(id,r.getId())>0)
   throw conflict("APARTMENT_HAS_OTHER_CLAIM","Phòng còn hợp đồng hoặc lựa chọn khác đang giữ. Không thể tự mở lại phòng.");
  var apartment=apartments.findForRequest(id).orElseThrow(SelectionCancellationService::missing);entities.refresh(apartment);
  if(apartment.getAvailability()!=Apartment.Availability.CONTRACT_IN_PROGRESS)throw conflict("APARTMENT_STATE_CHANGED","Phòng không còn ở trạng thái đang làm hợp đồng. Hãy tải lại.");
  if(s.contract()!=null)s.contract().setStatus(RentalContract.Status.CANCELLED);
  r.setStatus(RentalRequest.Status.CANCELLED);r.setDecidedAt(now());r.setDecisionReason(reason);
  apartment.setAvailability(Apartment.Availability.VACANT);
  // Publication, pending requests, signatures, snapshots and money are untouched.
 }
 private boolean eligible(Selection s){return s.request().getStatus()==RentalRequest.Status.ACCEPTED&&(s.contract()==null||(s.contract().getStatus()==RentalContract.Status.DRAFT&&s.contract().getRenewalOfContractId()==null))&&signatureCount(s)<2&&s.request().getApartment().getAvailability()==Apartment.Availability.CONTRACT_IN_PROGRESS;}
 private int signatureCount(Selection s){return s.draft()==null?0:(s.draft().getOwnerSignedAt()==null?0:1)+(s.draft().getCustomerSignedAt()==null?0:1);}
 private Map<String,Object> snapshot(Selection s){
  var r=s.request();var a=r.getApartment();var c=s.contract();var d=s.draft();var root=s.cancellation();var data=new LinkedHashMap<String,Object>();
  data.put("requestId",r.getId().toString());data.put("apartmentId",a.getId().toString());data.put("ownerId",a.getProperty().getOwner().getId().toString());data.put("customerId",r.getCustomer().getId().toString());
  data.put("requestStatus",r.getStatus().name());data.put("requestVersion",r.getVersion());data.put("decidedAt",r.getDecidedAt());data.put("decisionReason",r.getDecisionReason());data.put("contractId",c==null?null:c.getId().toString());data.put("contractStatus",c==null?null:c.getStatus().name());data.put("contractVersion",c==null?null:c.getVersion());data.put("contentVersion",d==null?null:d.getContentVersion());data.put("ownerSignedAt",d==null?null:d.getOwnerSignedAt());data.put("customerSignedAt",d==null?null:d.getCustomerSignedAt());data.put("signedContentHash",d==null?null:d.getSignedContentHash());data.put("apartmentStatus",a.getAvailability().name());data.put("apartmentVersion",a.getVersion());data.put("cancellationState",root==null?"NONE":root.getState().name());data.put("cancellationVersion",root==null?0:root.getVersion());data.put("cancellationUpdatedAt",root==null?null:root.getUpdatedAt());return data;
 }
 private String version(Selection s){return DossierAiReviewService.hash(json.writeValueAsString(snapshot(s)).getBytes(StandardCharsets.UTF_8));}
 private View view(Selection s,Long actor){
  var root=s.cancellation();var d=s.draft();boolean pending=root!=null&&root.getState()==SelectionCancellation.State.PENDING;boolean proposer=pending&&actor.equals(root.getProposerId());boolean eligible=eligible(s);
  String signing=d==null?"NO_CONTRACT":signatureCount(s)==2?"BOTH_SIGNED":d.getOwnerSignedAt()!=null?"OWNER_SIGNED":d.getCustomerSignedAt()!=null?"CUSTOMER_SIGNED":"UNSIGNED";
  var history=events.findByRequestIdOrderByIdAsc(s.request().getId()).stream().map(e->new Event(e.getId().toString(),e.getActorId().toString(),e.getActorName(),e.getAction(),e.getReason(),e.getCreatedAt(),json.readTree(e.getBeforeJson()),json.readTree(e.getAfterJson()))).toList();
  return new View(s.request().getId().toString(),s.contract()==null?null:s.contract().getId().toString(),s.request().getApartment().getTitle(),s.request().getStatus().name(),s.contract()==null?null:s.contract().getStatus().name(),signing,root==null?"NONE":root.getState().name(),root==null?null:root.getProposerId().toString(),root==null?null:root.getReason(),root==null||root.getResponderId()==null?null:root.getResponderId().toString(),root==null?null:root.getResponseReason(),version(s),eligible&&!pending&&(root==null||root.getState()!=SelectionCancellation.State.CANCELLED),eligible&&pending&&!proposer,eligible&&proposer,history);
 }
 private boolean repeated(SelectionCancellation root,Long actor,Action action,String reason){if(root==null)return false;return action==Action.START&&(root.getState()==SelectionCancellation.State.PENDING||root.getState()==SelectionCancellation.State.CANCELLED)&&actor.equals(root.getProposerId())&&Objects.equals(reason,root.getReason())
  ||action==Action.ACCEPT&&root.getState()==SelectionCancellation.State.CANCELLED&&actor.equals(root.getResponderId())&&Objects.equals(reason,root.getResponseReason())
  ||action==Action.REJECT&&root.getState()==SelectionCancellation.State.REJECTED&&actor.equals(root.getResponderId())&&Objects.equals(reason,root.getResponseReason())
  ||action==Action.WITHDRAW&&root.getState()==SelectionCancellation.State.WITHDRAWN&&actor.equals(root.getResponderId())&&Objects.equals(reason,root.getResponseReason());}
 private static void party(RentalRequest r,Long actor){if(!r.getCustomer().getId().equals(actor)&&!r.getApartment().getProperty().getOwner().getId().equals(actor))throw missing();}
 private static String clean(String s){return s==null||s.isBlank()?null:s.strip();}
 private static Instant now(){return Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);}
 private static ApiException conflict(String code,String message){return new ApiException(HttpStatus.CONFLICT,code,message);}
 private static ApiException bad(String message){return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",message);}
 private static ApiException forbidden(){return new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ bên còn lại được đồng ý/từ chối; người đề nghị được rút đề nghị.");}
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy yêu cầu thuộc tài khoản của bạn.");}
}
