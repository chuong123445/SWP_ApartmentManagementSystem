package com.ancu.proptech.controller.maintenance;
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

@RestController @RequiredArgsConstructor
public class MaintenanceController {
    private final MaintenanceTicketRepository tickets;
    private final AccountAccessService access;
    private final com.ancu.proptech.repository.maintenance.MaintenanceEventRepository events;
    private final jakarta.persistence.EntityManager entities;
    private final com.ancu.proptech.repository.property.PropertyRepository properties;
    private final com.ancu.proptech.repository.apartment.ApartmentRepository apartments;
    private final com.ancu.proptech.repository.contract.RentalContractRepository contracts;
    public record Create(Long propertyId,Long apartmentId,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=200) String title,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=3000) String description,
        @jakarta.validation.constraints.NotNull MaintenanceTicket.Category category,
        @jakarta.validation.constraints.NotNull MaintenanceTicket.Priority priority) {}
    @PostMapping({"/api/v1/owner/maintenance-tickets", "/api/v1/me/maintenance-tickets"}) @Transactional
    public org.springframework.http.ResponseEntity<Ticket> create(@AuthenticationPrincipal Jwt jwt,
        @jakarta.validation.Valid @RequestBody Create input,jakarta.servlet.http.HttpServletRequest request) {
        boolean ownerRoute=request.getRequestURI().startsWith("/api/v1/owner/");
        var account=ownerRoute?access.owner(jwt):access.customer(jwt);
        com.ancu.proptech.model.apartment.Apartment apartment=null;
        com.ancu.proptech.model.property.Property property;
        if(input.apartmentId()!=null){
            apartment=apartments.findForRequest(input.apartmentId()).orElseThrow(MaintenanceController::missing);
            property=apartment.getProperty();
            if(input.propertyId()!=null && !input.propertyId().equals(property.getId()))throw missing();
            if(ownerRoute){if(!property.getOwner().getId().equals(account.getId()))throw missing();}
            else {
                var lease=contracts.findByApartmentId(apartment.getId()).stream().filter(c->c.getStatus()==com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE && c.getCustomer().getId().equals(account.getId()) && !c.getStartDate().isAfter(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")))).findFirst().orElseThrow(MaintenanceController::missing);
                if(apartment.getAvailability()!=com.ancu.proptech.model.apartment.Apartment.Availability.OCCUPIED)throw missing();
            }
        }else{
            if(!ownerRoute || input.propertyId()==null)throw missing();
            property=properties.findById(input.propertyId()).filter(p->p.getOwner().getId().equals(account.getId())).orElseThrow(MaintenanceController::missing);
        }
        var t=new MaintenanceTicket();t.setProperty(property);t.setApartment(apartment);t.setReporter(account);
        t.setTitle(input.title().strip());t.setDescription(input.description().strip());t.setCategory(input.category());t.setPriority(input.priority());t.setStatus(MaintenanceTicket.Status.PENDING);t.setCreatedAt(Instant.now());
        if(!ownerRoute)t.setTenant(account);
        else if(apartment!=null)t.setTenant(contracts.findByApartmentId(apartment.getId()).stream().filter(c->c.getStatus()==com.ancu.proptech.model.contract.RentalContract.Status.ACTIVE).map(c->c.getCustomer()).findFirst().orElse(null));
        tickets.saveAndFlush(t);log(t,account.getId(),"CREATED","Đã báo sự cố");
        return org.springframework.http.ResponseEntity.status(201).body(view(t));
    }
    private static com.ancu.proptech.exception.common.ApiException missing(){return new com.ancu.proptech.exception.common.ApiException(org.springframework.http.HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy phòng hoặc quan hệ thuê thuộc tài khoản của bạn.");}
    public record History(String action,String note,Instant createdAt) {}
    public record Ticket(String id,String propertyId,String apartmentId,String roomNumber,String reporterName,
                         String title,String description,String category,String priority,String status,Instant createdAt,long version,
                         String technicianName,String technicianPhone,Instant scheduledAt,boolean canConfirm,String repairResult,java.util.List<History> history) {}
    public enum Action { ACCEPT, REJECT, ASSIGN, CANCEL, READY, CONFIRM, REOPEN }
    public record Change(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
        @jakarta.validation.constraints.NotNull Action action,@jakarta.validation.constraints.Size(max=3000) String note,
        @jakarta.validation.constraints.Size(max=200) String technicianName,
        @jakarta.validation.constraints.Pattern(regexp="[+0-9 ()-]{6,30}") String technicianPhone,Instant scheduledAt) {}
    @PostMapping({"/api/v1/owner/maintenance-tickets/{id}/actions","/api/v1/me/maintenance-tickets/{id}/actions"}) @Transactional
    public Ticket change(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@jakarta.validation.Valid @RequestBody Change input,jakarta.servlet.http.HttpServletRequest request){
        boolean ownerRoute=request.getRequestURI().startsWith("/api/v1/owner/");
        var owner=ownerRoute?access.owner(jwt):access.account(jwt);var t=tickets.lock(id).orElseThrow(MaintenanceController::missing);entities.refresh(t);
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
          case READY -> {if(state!=MaintenanceTicket.Status.IN_PROGRESS || note.isBlank())throw conflict("Cần phiếu đang sửa và kết quả sửa chữa.");t.setRepairResult(note);t.setStatus(MaintenanceTicket.Status.AWAITING_CONFIRMATION);}
          case CONFIRM -> {if(state!=MaintenanceTicket.Status.AWAITING_CONFIRMATION)throw conflict("Phiếu chưa chờ nghiệm thu.");if(ownerRoute && t.getTenant()!=null)throw conflict("Khách thuê phải tự xác nhận kết quả bằng tài khoản của mình.");t.setStatus(MaintenanceTicket.Status.RESOLVED);}
          case REOPEN -> {if(state!=MaintenanceTicket.Status.AWAITING_CONFIRMATION || note.isBlank())throw conflict("Cần phiếu chờ xác nhận và lý do sửa lại.");if(ownerRoute && t.getTenant()!=null)throw conflict("Khách thuê cần tự gửi yêu cầu sửa lại.");t.setStatus(MaintenanceTicket.Status.IN_PROGRESS);}
        }
        tickets.saveAndFlush(t);log(t,owner.getId(),input.action().name(),note);return view(t);
    }
    private void log(MaintenanceTicket t,Long actor,String action,String note){var e=new com.ancu.proptech.model.maintenance.MaintenanceEvent();e.setTicketId(t.getId());e.setActorId(actor);e.setAction(action);e.setNote(note);e.setCreatedAt(Instant.now());events.saveAndFlush(e);}
    private static com.ancu.proptech.exception.common.ApiException conflict(String message){return new com.ancu.proptech.exception.common.ApiException(org.springframework.http.HttpStatus.CONFLICT,"INVALID_STATE",message);}
    @GetMapping("/api/v1/owner/maintenance-tickets") @Transactional(readOnly=true)
    public PageResponse<Ticket> owner(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        ApartmentService.validatePage(page,size);
        var owner=access.owner(jwt);
        return PageResponse.from(tickets.ownerTickets(owner.getId(),propertyId,paging(page,size)).map(this::view));
    }
    @GetMapping("/api/v1/me/maintenance-tickets") @Transactional(readOnly=true)
    public PageResponse<Ticket> mine(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        ApartmentService.validatePage(page,size);
        return PageResponse.from(tickets.mine(access.account(jwt).getId(),paging(page,size)).map(this::view));
    }
    private Pageable paging(int page,int size){return PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"createdAt","id"));}
    private Ticket view(MaintenanceTicket t){return new Ticket(t.getId().toString(),t.getProperty().getId().toString(),
        t.getApartment()==null?null:t.getApartment().getId().toString(),t.getApartment()==null?"Toàn tòa":t.getApartment().getTitle(),
        t.getReporter().getFullName(),t.getTitle(),t.getDescription(),t.getCategory().name(),t.getPriority().name(),t.getStatus().name(),t.getCreatedAt(),t.getVersion(),
        t.getTechnicianName(),t.getTechnicianPhone(),t.getScheduledAt(),t.getTenant()!=null,t.getRepairResult(),
        events.findByTicketIdOrderByIdAsc(t.getId()).stream().map(e->new History(e.getAction(),e.getNote(),e.getCreatedAt())).toList());}
}
