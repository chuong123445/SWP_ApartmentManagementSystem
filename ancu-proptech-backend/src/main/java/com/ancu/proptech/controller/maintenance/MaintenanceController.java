package com.ancu.proptech.controller.maintenance;
import static com.ancu.proptech.dto.maintenance.MaintenanceDtos.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.service.maintenance.MaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
@RestController @RequiredArgsConstructor
public class MaintenanceController {
 private final MaintenanceService service;
 @PostMapping({"/api/v1/owner/maintenance-tickets","/api/v1/me/maintenance-tickets"})
 public ResponseEntity<Ticket> create(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Create input,HttpServletRequest request){return ResponseEntity.status(201).body(service.create(jwt,input,ownerRoute(request)));}
 @PostMapping({"/api/v1/owner/maintenance-tickets/{id}/actions","/api/v1/me/maintenance-tickets/{id}/actions"})
 public Ticket change(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Change input,HttpServletRequest request){return service.change(jwt,id,input,ownerRoute(request));}
 @GetMapping("/api/v1/owner/maintenance-tickets")
 public PageResponse<Ticket> owner(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.owner(jwt,propertyId,page,size);}
 @GetMapping("/api/v1/me/maintenance-tickets")
 public PageResponse<Ticket> mine(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.mine(jwt,page,size);}
 private boolean ownerRoute(HttpServletRequest request){return request.getRequestURI().startsWith("/api/v1/owner/");}
}
