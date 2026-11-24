package com.ancu.proptech.controller.billing;
import com.ancu.proptech.dto.billing.InvoiceRoomSummary;
import com.ancu.proptech.service.billing.InvoiceRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import java.util.List;
@RestController @RequiredArgsConstructor
public class InvoiceRoomController {
 private final InvoiceRoomService service;
 @GetMapping("/api/v1/owner/invoices/rooms") public ResponseEntity<List<InvoiceRoomSummary>> rooms(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.rooms(jwt,propertyId));}
}
