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
        tickets.saveAndFlush(t);
        return org.springframework.http.ResponseEntity.status(201).body(view(t));
    }
    private static com.ancu.proptech.exception.common.ApiException missing(){return new com.ancu.proptech.exception.common.ApiException(org.springframework.http.HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy phòng hoặc quan hệ thuê thuộc tài khoản của bạn.");}
    public record Ticket(String id,String propertyId,String apartmentId,String roomNumber,String reporterName,
                         String title,String description,String category,String priority,String status,Instant createdAt,long version) {}
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
        return PageResponse.from(tickets.findByReporterId(access.account(jwt).getId(),paging(page,size)).map(this::view));
    }
    private Pageable paging(int page,int size){return PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"createdAt","id"));}
    private Ticket view(MaintenanceTicket t){return new Ticket(t.getId().toString(),t.getProperty().getId().toString(),
        t.getApartment()==null?null:t.getApartment().getId().toString(),t.getApartment()==null?"Toàn tòa":t.getApartment().getTitle(),
        t.getReporter().getFullName(),t.getTitle(),t.getDescription(),t.getCategory().name(),t.getPriority().name(),t.getStatus().name(),t.getCreatedAt(),t.getVersion());}
}
