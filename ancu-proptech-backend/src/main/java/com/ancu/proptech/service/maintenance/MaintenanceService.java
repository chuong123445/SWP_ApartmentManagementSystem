package com.ancu.proptech.service.maintenance;
import static com.ancu.proptech.dto.maintenance.MaintenanceDtos.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.model.maintenance.MaintenanceTicket;
import com.ancu.proptech.repository.maintenance.MaintenanceTicketRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.apartment.ApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.time.Instant;

@org.springframework.stereotype.Service @RequiredArgsConstructor
public class MaintenanceService {
    private final MaintenanceTicketRepository tickets;
    private final AccountAccessService access;
    private final com.ancu.proptech.repository.maintenance.MaintenanceEventRepository events;
    private final jakarta.persistence.EntityManager entities;
    private final com.ancu.proptech.repository.maintenance.MaintenanceImageRepository images;
    private final com.ancu.proptech.repository.property.PropertyRepository properties;
    private final com.ancu.proptech.repository.apartment.ApartmentRepository apartments;
    private final com.ancu.proptech.repository.contract.RentalContractRepository contracts;
    @Transactional
    public Ticket create(Jwt jwt,
        Create input,boolean ownerRoute) {
        var account=ownerRoute?access.owner(jwt):access.customer(jwt);
        com.ancu.proptech.model.apartment.Apartment apartment=null;
        com.ancu.proptech.model.property.Property property;
        if(input.apartmentId()!=null){
            apartment=apartments.findForRequest(input.apartmentId()).orElseThrow(MaintenanceService::missing);
            property=apartment.getProperty();
            if(input.propertyId()!=null && !input.propertyId().equals(property.getId()))throw missing();
            if(ownerRoute){if(!property.getOwner().getId().equals(account.getId()))throw missing();}
            else {
                var lease=contracts.findByApartmentId(apartment.getId()).stream().filter(c->c.getStatus()==com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE && c.getCustomer().getId().equals(account.getId()) && !c.getStartDate().isAfter(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")))).findFirst().orElseThrow(MaintenanceService::missing);
                if(apartment.getAvailability()!=com.ancu.proptech.model.apartment.Apartment.Availability.OCCUPIED)throw missing();
            }
        }else{
            if(!ownerRoute || input.propertyId()==null)throw missing();
            property=properties.findById(input.propertyId()).filter(p->p.getOwner().getId().equals(account.getId())).orElseThrow(MaintenanceService::missing);
        }
        var t=new MaintenanceTicket();t.setProperty(property);t.setApartment(apartment);t.setReporter(account);
        t.setTitle(input.title().strip());t.setDescription(input.description().strip());t.setCategory(input.category());t.setPriority(input.priority());t.setStatus(MaintenanceTicket.Status.PENDING);t.setCreatedAt(Instant.now());
        if(!ownerRoute)t.setTenant(account);
        else if(apartment!=null)t.setTenant(contracts.findByApartmentId(apartment.getId()).stream().filter(c->c.getStatus()==com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE).map(c->c.getCustomer()).findFirst().orElse(null));
        tickets.saveAndFlush(t);log(t,account.getId(),"CREATED","Đã báo sự cố");
        return view(t);
    }
    private static com.ancu.proptech.exception.common.ApiException missing(){return new com.ancu.proptech.exception.common.ApiException(org.springframework.http.HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy phòng hoặc quan hệ thuê thuộc tài khoản của bạn.");}
    @Transactional
    public Ticket change(Jwt jwt,Long id,Change input,boolean ownerRoute){
        var owner=ownerRoute?access.owner(jwt):access.account(jwt);var t=tickets.lock(id).orElseThrow(MaintenanceService::missing);entities.refresh(t);
        if(ownerRoute){if(!t.getProperty().getOwner().getId().equals(owner.getId()))throw missing();}
        else if(t.getTenant()==null || !t.getTenant().getId().equals(owner.getId()))throw missing();
        if(!ownerRoute && input.action()!=Action.CONFIRM && input.action()!=Action.REOPEN)throw new com.ancu.proptech.exception.common.ApiException(org.springframework.http.HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ chủ nhà được xử lý phiếu.");
        if(t.getVersion()!=input.version())throw conflict("Dữ liệu đã thay đổi. Hãy làm mới trước khi xử lý.");
        var state=t.getStatus();String note=input.note()==null?"":input.note().strip();
        switch(input.action()){
          case ACCEPT -> {if(state!=MaintenanceTicket.Status.PENDING)throw conflict("Chỉ tiếp nhận phiếu đang chờ.");t.setStatus(MaintenanceTicket.Status.ACCEPTED);}
          case REJECT -> {if(state!=MaintenanceTicket.Status.PENDING || note.isBlank())throw conflict("Cần phiếu đang chờ và lý do từ chối.");t.setStatus(MaintenanceTicket.Status.REJECTED);}
          case CANCEL -> {if(state!=MaintenanceTicket.Status.PENDING && state!=MaintenanceTicket.Status.ACCEPTED)throw conflict("Không thể hủy phiếu đã bắt đầu sửa.");if(note.isBlank())throw conflict("Cần nhập lý do hủy.");t.setStatus(MaintenanceTicket.Status.CANCELLED);}
          case ASSIGN -> {if(state!=MaintenanceTicket.Status.ACCEPTED && state!=MaintenanceTicket.Status.IN_PROGRESS)throw conflict("Cần tiếp nhận trước khi giao thợ.");
            if(input.technicianName()==null || input.technicianName().isBlank() || input.technicianPhone()==null || input.scheduledAt()==null)throw conflict("Cần tên thợ, số điện thoại và lịch hẹn.");
            t.setTechnicianName(input.technicianName().strip());t.setTechnicianPhone(input.technicianPhone());t.setScheduledAt(input.scheduledAt());t.setStatus(MaintenanceTicket.Status.IN_PROGRESS);}
          case READY -> {if(state!=MaintenanceTicket.Status.IN_PROGRESS || note.isBlank())throw conflict("Cần phiếu đang sửa và kết quả sửa chữa.");
            if(input.actualCost()==null || input.costResponsibility()==null)throw conflict("Cần nhập chi phí thực tế và bên chịu phí (nhập 0 nếu không phát sinh).");
            if(t.getTenant()==null && input.costResponsibility()!=CostResponsibility.OWNER)throw conflict("Không có khách thuê liên quan để phân bổ chi phí.");
            var share=switch(input.costResponsibility()){case OWNER->java.math.BigDecimal.ZERO;case CUSTOMER->input.actualCost();case SHARED->input.customerCost();};
            if(share==null || share.compareTo(input.actualCost())>0)throw conflict("Phần chi phí khách chịu phải từ 0 đến tổng chi phí.");
            t.setActualCost(input.actualCost());t.setCustomerCost(share);t.setCostResponsibility(input.costResponsibility().name());
            log(t,owner.getId(),"COST_RECORDED","Tổng: "+input.actualCost().toPlainString()+"; phần khách: "+share.toPlainString()+"; bên chịu: "+input.costResponsibility().name());
            t.setRepairResult(note);t.setStatus(MaintenanceTicket.Status.AWAITING_CONFIRMATION);}
          case CONFIRM -> {if(state!=MaintenanceTicket.Status.AWAITING_CONFIRMATION)throw conflict("Phiếu chưa chờ nghiệm thu.");if(ownerRoute && t.getTenant()!=null)throw conflict("Khách thuê phải tự xác nhận kết quả bằng tài khoản của mình.");t.setStatus(MaintenanceTicket.Status.RESOLVED);}
          case REOPEN -> {if(state!=MaintenanceTicket.Status.AWAITING_CONFIRMATION || note.isBlank())throw conflict("Cần phiếu chờ xác nhận và lý do sửa lại.");if(ownerRoute && t.getTenant()!=null)throw conflict("Khách thuê cần tự gửi yêu cầu sửa lại.");t.setStatus(MaintenanceTicket.Status.IN_PROGRESS);}
        }
        tickets.saveAndFlush(t);log(t,owner.getId(),input.action().name(),note);return view(t);
    }
    private void log(MaintenanceTicket t,Long actor,String action,String note){var e=new com.ancu.proptech.model.maintenance.MaintenanceEvent();e.setTicketId(t.getId());e.setActorId(actor);e.setAction(action);e.setNote(note);e.setCreatedAt(Instant.now());events.saveAndFlush(e);}
    private static com.ancu.proptech.exception.common.ApiException conflict(String message){return new com.ancu.proptech.exception.common.ApiException(org.springframework.http.HttpStatus.CONFLICT,"INVALID_STATE",message);}
    @Transactional(readOnly=true)
    public PageResponse<Ticket> owner(Jwt jwt,Long propertyId,
        int page,int size) {
        ApartmentService.validatePage(page,size);
        var owner=access.owner(jwt);
        return PageResponse.from(tickets.ownerTickets(owner.getId(),propertyId,paging(page,size)).map(this::view));
    }
    @Transactional(readOnly=true)
    public PageResponse<Ticket> mine(Jwt jwt,int page,int size) {
        ApartmentService.validatePage(page,size);
        return PageResponse.from(tickets.mine(access.account(jwt).getId(),paging(page,size)).map(this::view));
    }
    private Pageable paging(int page,int size){return PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"createdAt","id"));}
    private Ticket view(MaintenanceTicket t){return new Ticket(t.getId().toString(),t.getProperty().getId().toString(),
        t.getApartment()==null?null:t.getApartment().getId().toString(),t.getApartment()==null?"Toàn tòa":t.getApartment().getTitle(),
        t.getReporter().getFullName(),t.getTitle(),t.getDescription(),t.getCategory().name(),t.getPriority().name(),t.getStatus().name(),t.getCreatedAt(),t.getVersion(),
        t.getTechnicianName(),t.getTechnicianPhone(),t.getScheduledAt(),t.getTenant()!=null,t.getRepairResult(),
        t.getActualCost()==null?null:t.getActualCost().toPlainString(),t.getCustomerCost()==null?null:t.getCustomerCost().toPlainString(),t.getCostResponsibility(),
        events.findByTicketIdOrderByIdAsc(t.getId()).stream().map(e->new History(e.getAction(),e.getNote(),e.getCreatedAt())).toList(),
        images.findByTicketIdOrderByIdAsc(t.getId()).stream().map(i->new Image(i.getId().toString(),i.getKind())).toList());}
}
