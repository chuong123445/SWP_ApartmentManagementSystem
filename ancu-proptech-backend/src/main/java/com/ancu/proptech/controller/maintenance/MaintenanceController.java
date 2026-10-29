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
