package com.ancu.proptech.service.contract;

import static com.ancu.proptech.dto.contract.ContractExitDtos.*;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.property.PropertyRightsPolicy;
import com.ancu.proptech.service.ai.AssistanceAudit;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class ContractExitService {
 private final ContractExitCaseRepository cases;
 private final ContractExitEventRepository events;
 private final ContractExitEvidenceRepository evidence;
 private final ContractDraftRepository drafts;
 private final RentalContractRepository contracts;
 private final ContractHandoverRepository legacyHandovers;
 private final ContractRenewalRequestRepository renewals;
 private final RentalRequestRepository requests;
 private final RentalInvoiceRepository invoices;
 private final ApartmentRepository apartments;
 private final AccountAccessService access;
 private final PropertyRightsPolicy dates;
 private final ObjectMapper json;
 private final jakarta.persistence.EntityManager entities;
 record Context(AuthAccount actor,ContractDraft draft,RentalContract contract,ContractExitCase exit){}

 @Transactional(readOnly=true) public View get(Jwt jwt,Long id){return view(load(jwt,id,false));}
 Context load(Jwt jwt,Long id,boolean lock){
  var actor=access.account(jwt);var c=contracts.findById(id).orElseThrow(ContractExitService::missing);party(c,actor.getId());
  var d=drafts.findByContractId(id).orElseThrow(ContractExitService::missing);
  if(lock){
   var owner=c.getApartment().getProperty().getOwner().getId();
   if(c.getRenewalOfContractId()!=null)requests.findForOwnerUpdate(drafts.findRequestId(c.getRenewalOfContractId()).orElseThrow(ContractExitService::missing),owner).orElseThrow(ContractExitService::missing);
   requests.findForOwnerUpdate(d.getRentalRequest().getId(),owner).orElseThrow(ContractExitService::missing);
   c=contracts.lockById(id).orElseThrow(ContractExitService::missing);
  }
  entities.refresh(c);entities.refresh(d);entities.refresh(c.getApartment());party(c,actor.getId());
  var root=cases.findById(id).orElseGet(()->{var n=new ContractExitCase();n.setContractId(id);n.setUpdatedAt(now());return n;});
  if(entities.contains(root))entities.refresh(root);
  return new Context(actor,d,c,root);
 }
 @Transactional public View act(Jwt jwt,Long id,Command input){
  var s=load(jwt,id,true);var c=s.contract();var root=s.exit();var actor=s.actor().getId();
  if(!input.consent())throw bad("Cần xác nhận đồng ý trước khi xử lý.");
  if(!version(s).equals(input.sourceVersion()))throw conflict("STALE_VERSION","Đề nghị, hợp đồng hoặc chỉ số đã thay đổi. Hãy tải lại và xác nhận lại.");
  if(!active(c))throw conflict("EXIT_UNAVAILABLE","Chỉ xử lý kết thúc cư trú cho hợp đồng đang hiệu lực và đã bắt đầu.");
  String before=json.writeValueAsString(snapshot(s));String reason=clean(input.reason());var t=term(root);var h=hand(root);
  switch(input.action()){
   case PROPOSE_TERMINATION -> {
    if(input.termination()==null)throw bad("Cần thông tin đề nghị kết thúc sớm.");
    if(!canProposeTermination(s))throw conflict("EXIT_UNAVAILABLE","Đã có đề nghị kết thúc/bàn giao/thuê tiếp hoặc hợp đồng đã đến hạn.");
    var v=input.termination();
    if(v.returnDate().isBefore(dates.today())||v.returnDate().isBefore(c.getStartDate())||!v.returnDate().isBefore(c.getEndDate()))throw bad("Ngày kết thúc sớm phải từ hôm nay, trong thời hạn hợp đồng.");
    if(v.penaltyAmount().signum()==0&&!v.penaltyPayer().equals("NONE")||v.penaltyAmount().signum()>0&&v.penaltyPayer().equals("NONE"))throw bad("Cần chỉ rõ bên chịu khoản đề xuất; số tiền 0 chọn Không phát sinh.");
    root.setTerminationState("PENDING");root.setTerminationJson(json.writeValueAsString(new Term(actor.toString(),v.returnDate(),v.reason().strip(),v.clauseReference().strip(),v.penaltyAmount().toPlainString(),v.penaltyPayer(),null,null)));reason=v.reason().strip();
   }
   case ACCEPT_TERMINATION,REJECT_TERMINATION,WITHDRAW_TERMINATION -> {
    if(!root.getTerminationState().equals("PENDING")||t==null)throw conflict("NO_PENDING_TERMINATION","Không có đề nghị kết thúc đang chờ.");
    boolean proposer=actor.toString().equals(t.proposerId());
    if((input.action()==Action.WITHDRAW_TERMINATION)!=proposer)throw forbidden();
    if(input.action()==Action.REJECT_TERMINATION&&reason.isEmpty())throw bad("Cần lý do từ chối.");
    if(input.action()==Action.ACCEPT_TERMINATION)requireNoCompetingFlow(c);
    root.setTerminationState(input.action()==Action.ACCEPT_TERMINATION?"AGREED":input.action()==Action.REJECT_TERMINATION?"REJECTED":"WITHDRAWN");
    root.setTerminationJson(json.writeValueAsString(new Term(t.proposerId(),t.returnDate(),t.reason(),t.clauseReference(),t.penaltyAmount(),t.penaltyPayer(),actor.toString(),reason)));
   }
   case PROPOSE_HANDOVER -> {
    owner(s);if(input.handover()==null)throw bad("Cần thông tin bàn giao.");
    if(!canProposeHandover(s))throw conflict("HANDOVER_UNAVAILABLE","Chưa đủ điều kiện lập hoặc thay biên bản bàn giao.");
    requireNoCompetingFlow(c);requireNoDraft(c);var v=input.handover();
    var earliest=root.getTerminationState().equals("AGREED")?t.returnDate():c.getEndDate();
    if(v.returnDate().isBefore(earliest)||v.returnDate().isAfter(dates.today()))throw bad("Ngày bàn giao thực tế phải từ ngày kết thúc đã thỏa thuận đến hôm nay.");
    if(!v.keysReturned())throw bad("Cần xác nhận bàn giao chìa khóa và tài sản.");
    var ids=selectedEvidence(s,v.evidenceIds());var source=meter(c,v.electricityStartReading(),v.waterStartReading());
    var electric=BigDecimal.valueOf(v.electricityReading());var water=BigDecimal.valueOf(v.waterReading());
    if(electric.compareTo(source[0])<0||water.compareTo(source[1])<0)throw bad("Chỉ số cuối không được nhỏ hơn đầu kỳ.");
    var utility=electric.subtract(source[0]).multiply(c.getElectricityUnitPrice()).add(c.getWaterBillingMode()==com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.METERED?water.subtract(source[1]).multiply(c.getWaterUnitPrice()):BigDecimal.ZERO);
    root.setHandoverState("PENDING");root.setHandoverJson(json.writeValueAsString(new Hand(v.returnDate(),source[0].toPlainString(),source[1].toPlainString(),electric.toPlainString(),water.toPlainString(),utility.toPlainString(),v.conditionNotes().strip(),true,ids,null,null,List.of())));reason=v.conditionNotes().strip();
   }
   case CONFIRM_HANDOVER -> {
    customer(s);if(!root.getHandoverState().equals("PENDING")||h==null)throw conflict("NO_PENDING_HANDOVER","Biên bản không còn chờ xác nhận.");
    requireNoCompetingFlow(c);requireNoDraft(c);
    var source=meter(c,Long.valueOf(h.electricityStartReading().split("\\.")[0]),Long.valueOf(h.waterStartReading().split("\\.")[0]));
    if(source[0].compareTo(new BigDecimal(h.electricityStartReading()))!=0||source[1].compareTo(new BigDecimal(h.waterStartReading()))!=0)throw conflict("HANDOVER_SOURCE_CHANGED","Chỉ số nguồn đã thay đổi; chủ nhà cần lập lại biên bản.");
    if(contracts.findByApartmentId(c.getApartment().getId()).stream().anyMatch(other->!other.getId().equals(id)&&other.isOpen())||requests.countOtherLiveAccepted(c.getApartment().getId(),s.draft().getRentalRequest().getId())>0)throw conflict("APARTMENT_HAS_OTHER_CLAIM","Phòng còn quan hệ thuê khác, chưa thể mở lại.");
    var a=apartments.findForRequest(c.getApartment().getId()).orElseThrow(ContractExitService::missing);entities.refresh(a);
    if(a.getAvailability()!=Apartment.Availability.OCCUPIED)throw conflict("APARTMENT_STATE_CHANGED","Phòng không còn ở trạng thái đang thuê.");
    c.setStatus(RentalContract.Status.ENDED);c.setEndReason(root.getTerminationState().equals("AGREED")?"EARLY_TERMINATION":"HANDOVER");c.setEndedAt(now());
    a.setAvailability(Apartment.Availability.VACANT);a.setElectricityIndex(new BigDecimal(h.electricityReading()).intValueExact());a.setWaterIndex(new BigDecimal(h.waterReading()).intValueExact());root.setHandoverState("CONFIRMED");
   }
   case DISPUTE_HANDOVER -> {
    customer(s);if(!root.getHandoverState().equals("PENDING")||h==null)throw conflict("NO_PENDING_HANDOVER","Không có biên bản đang chờ để phản hồi.");
    if(reason.isEmpty())throw bad("Cần mô tả nội dung không đồng ý và thông tin cần sửa.");
    root.setHandoverState("DISPUTED");root.setHandoverJson(json.writeValueAsString(new Hand(h.returnDate(),h.electricityStartReading(),h.waterStartReading(),h.electricityReading(),h.waterReading(),h.utilityAmount(),h.conditionNotes(),h.keysReturned(),h.evidenceIds(),reason,actor.toString(),selectedEvidence(s,input.evidenceIds()==null?List.of():input.evidenceIds()))));
   }
   case CANCEL_HANDOVER -> {
    owner(s);if(!Set.of("PENDING","DISPUTED").contains(root.getHandoverState()))throw conflict("NO_PENDING_HANDOVER","Không có biên bản đang xử lý.");
    if(reason.isEmpty())throw bad("Cần lý do hủy biên bản.");root.setHandoverState("CANCELLED");
   }
  }
  root.setUpdatedAt(now());cases.saveAndFlush(root);entities.flush();
  var event=new ContractExitEvent();event.setContractId(id);event.setActorId(actor);event.setActorName(s.actor().getFullName());event.setAction(input.action().name());event.setReason(reason);event.setBeforeJson(before);event.setAfterJson(json.writeValueAsString(snapshot(s)));event.setCreatedAt(root.getUpdatedAt());events.saveAndFlush(event);
  return view(s);
 }
 private boolean active(RentalContract c){return c.getStatus()==RentalContract.Status.ACTIVE&&!c.getStartDate().isAfter(dates.today());}
 private boolean competing(RentalContract c){return legacyHandovers.existsByContractIdAndStatus(c.getId(),ContractHandover.Status.PENDING)||contracts.findByRenewalOfContractIdAndStatusNot(c.getId(),RentalContract.Status.ENDED).stream().anyMatch(RentalContract::isOpen)||renewals.findByContractId(c.getId()).map(r->Set.of(ContractRenewalRequest.Status.PENDING,ContractRenewalRequest.Status.ACCEPTED).contains(r.getStatus())).orElse(false);}
 private void requireNoCompetingFlow(RentalContract c){if(competing(c))throw conflict("OPEN_RENEWAL_OR_HANDOVER","Cần xử lý yêu cầu thuê tiếp hoặc biên bản bàn giao cũ trước.");}
 private void requireNoDraft(RentalContract c){if(invoices.existsByContractIdAndStatus(c.getId(),RentalInvoice.Status.DRAFT))throw conflict("OPEN_INVOICE_DRAFT","Cần gửi hoặc hủy hóa đơn nháp trước khi bàn giao. Hóa đơn đã gửi còn nợ vẫn được giữ.");}
 private boolean canProposeTermination(Context s){return active(s.contract())&&dates.today().isBefore(s.contract().getEndDate())&&!Set.of("PENDING","AGREED").contains(s.exit().getTerminationState())&&!Set.of("PENDING","DISPUTED","CONFIRMED").contains(s.exit().getHandoverState())&&!competing(s.contract());}
 private boolean canProposeHandover(Context s){return active(s.contract())&&!s.exit().getTerminationState().equals("PENDING")&&!Set.of("PENDING","CONFIRMED").contains(s.exit().getHandoverState())&&(s.exit().getTerminationState().equals("AGREED")?!term(s.exit()).returnDate().isAfter(dates.today()):!s.contract().getEndDate().isAfter(dates.today()))&&!competing(s.contract());}
 private BigDecimal[] meter(RentalContract c,Long suppliedElectric,Long suppliedWater){
  var last=invoices.findFirstByContractIdAndStatusOrderByPeriodDesc(c.getId(),RentalInvoice.Status.SENT);
  var e=last.map(RentalInvoice::getElectricityEndReading).orElse(c.getElectricityBaseline());var w=last.map(RentalInvoice::getWaterEndReading).orElse(c.getWaterBaseline());
  if(e==null&&suppliedElectric!=null)e=BigDecimal.valueOf(suppliedElectric);if(w==null&&suppliedWater!=null)w=BigDecimal.valueOf(suppliedWater);
  if(e==null||w==null)throw conflict("METER_BASELINE_MISSING","Thiếu chỉ số đầu; nhập mốc đã đối chiếu để bên thuê xác nhận, không mặc định bằng 0.");return new BigDecimal[]{e,w};
 }
 private List<String> selectedEvidence(Context s,List<Long> ids){if(new HashSet<>(ids).size()!=ids.size())throw bad("Chứng cứ bị lặp.");return ids.stream().map(id->evidence.findById(id).filter(e->e.getContractId().equals(s.contract().getId())&&e.getUploaderId().equals(s.actor().getId())).orElseThrow(ContractExitService::missing)).map(e->e.getId().toString()).toList();}
 private Term term(ContractExitCase root){return root.getTerminationJson()==null?null:json.readValue(root.getTerminationJson(),Term.class);}
 private Hand hand(ContractExitCase root){return root.getHandoverJson()==null?null:json.readValue(root.getHandoverJson(),Hand.class);}
 private Map<String,Object> snapshot(Context s){
  var c=s.contract();var a=c.getApartment();var r=s.exit();var data=new LinkedHashMap<String,Object>();
  data.put("contractId",c.getId().toString());data.put("ownerId",a.getProperty().getOwner().getId().toString());data.put("customerId",c.getCustomer().getId().toString());data.put("contractStatus",c.getStatus());data.put("contractVersion",c.getVersion());data.put("billingVersion",c.getBillingVersion());data.put("apartmentId",a.getId().toString());data.put("apartmentVersion",a.getVersion());data.put("apartmentStatus",a.getAvailability());data.put("terminationState",r.getTerminationState());data.put("termination",term(r));data.put("handoverState",r.getHandoverState());data.put("handover",hand(r));data.put("exitVersion",r.getVersion());return data;
 }
 private String version(Context s){return AssistanceAudit.hash(json.writeValueAsString(snapshot(s)));}
 private View view(Context s){
  var c=s.contract();var r=s.exit();var t=term(r);boolean owner=c.getApartment().getProperty().getOwner().getId().equals(s.actor().getId());boolean pending=r.getTerminationState().equals("PENDING")&&active(c);boolean proposer=t!=null&&t.proposerId().equals(s.actor().getId().toString());boolean hPending=r.getHandoverState().equals("PENDING")&&active(c);
  return new View(c.getId().toString(),c.getStatus().name(),c.getApartment().getProperty().getOwner().getId().toString(),c.getCustomer().getId().toString(),dates.today(),c.getStartDate(),c.getEndDate(),version(s),r.getTerminationState(),t,r.getHandoverState(),hand(r),canProposeTermination(s),pending&&!proposer,pending&&proposer,owner&&canProposeHandover(s),!owner&&hPending,!owner&&hPending,owner&&active(c)&&Set.of("PENDING","DISPUTED").contains(r.getHandoverState()),
   evidence.findByContractIdOrderByIdAsc(c.getId()).stream().map(e->new Evidence(e.getId().toString(),e.getFilename(),e.getUploaderId().toString(),e.getCreatedAt())).toList(),events.findByContractIdOrderByIdAsc(c.getId()).stream().map(e->new Event(e.getId().toString(),e.getActorId().toString(),e.getActorName(),e.getAction(),e.getReason(),e.getCreatedAt(),json.readTree(e.getBeforeJson()),json.readTree(e.getAfterJson()))).toList());
 }
 @Transactional public Evidence upload(Jwt jwt,Long id,org.springframework.web.multipart.MultipartFile file)throws java.io.IOException{
  var s=load(jwt,id,true);if(!active(s.contract()))throw conflict("EXIT_UNAVAILABLE","Chỉ thêm chứng cứ khi hợp đồng đang hiệu lực.");
  if(file.isEmpty()||file.getSize()>1000000||evidence.countByContractId(id)>=20)throw bad("Mỗi hợp đồng tối đa 20 ảnh JPEG/PNG, mỗi ảnh tối đa 1 MB.");
  byte[] bytes=file.getBytes();String format;
  try(var input=javax.imageio.ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(bytes))){
   var readers=javax.imageio.ImageIO.getImageReaders(input);if(!readers.hasNext())throw bad("Ảnh JPEG/PNG không hợp lệ.");var reader=readers.next();
   try{reader.setInput(input);format=reader.getFormatName().toLowerCase(Locale.ROOT);if(!Set.of("png","jpeg").contains(format)||reader.getWidth(0)>4096||reader.getHeight(0)>4096||(long)reader.getWidth(0)*reader.getHeight(0)>12000000)throw bad("Định dạng hoặc kích thước ảnh không hợp lệ.");var image=reader.read(0);if(image==null)throw bad("Không đọc được ảnh.");var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,format,output);bytes=output.toByteArray();if(bytes.length>4000000)throw bad("Ảnh sau xử lý vượt giới hạn.");}finally{reader.dispose();}
  }catch(javax.imageio.IIOException e){throw bad("Ảnh bị lỗi.");}
  var e=new ContractExitEvidence();e.setContractId(id);e.setUploaderId(s.actor().getId());e.setFilename("Chứng cứ "+(evidence.countByContractId(id)+1)+(format.equals("png")?".png":".jpg"));e.setContentType(format.equals("png")?"image/png":"image/jpeg");e.setContent(bytes);e.setCreatedAt(now());evidence.saveAndFlush(e);return new Evidence(e.getId().toString(),e.getFilename(),e.getUploaderId().toString(),e.getCreatedAt());
 }
 @Transactional(readOnly=true) public Content download(Jwt jwt,Long contractId,Long id){load(jwt,contractId,false);var e=evidence.findById(id).filter(v->v.getContractId().equals(contractId)).orElseThrow(ContractExitService::missing);return new Content(e.getContent(),e.getContentType());}
 private void owner(Context s){if(!s.contract().getApartment().getProperty().getOwner().getId().equals(s.actor().getId()))throw forbidden();}
 private void customer(Context s){if(!s.contract().getCustomer().getId().equals(s.actor().getId()))throw forbidden();}
 private static String clean(String s){return s==null?"":s.strip();}
 private static Instant now(){return Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);}
 private static void party(RentalContract c,Long id){if(!c.getCustomer().getId().equals(id)&&!c.getApartment().getProperty().getOwner().getId().equals(id))throw missing();}
 private static ApiException bad(String msg){return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",msg);}
 private static ApiException conflict(String code,String msg){return new ApiException(HttpStatus.CONFLICT,code,msg);}
 private static ApiException forbidden(){return new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ đúng bên còn lại/chủ nhà/người thuê được thực hiện thao tác này.");}
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hợp đồng hoặc chứng cứ thuộc tài khoản của bạn.");}
}
