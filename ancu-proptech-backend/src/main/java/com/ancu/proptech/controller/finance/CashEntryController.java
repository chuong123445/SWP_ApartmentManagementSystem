package com.ancu.proptech.controller.finance;
import com.ancu.proptech.dto.finance.CashDtos.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.model.finance.CashEntry.*;
import com.ancu.proptech.service.finance.CashEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.net.URI;

@RestController @RequestMapping("/api/v1/owner/cash-entries") @RequiredArgsConstructor
public class CashEntryController {
    private final CashEntryService service;
    @PostMapping public ResponseEntity<Entry> create(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Create input){var e=service.create(jwt,input);return ResponseEntity.created(URI.create("/api/v1/owner/cash-entries/"+e.id())).cacheControl(CacheControl.noStore()).body(e);}
    @GetMapping public ResponseEntity<PageResponse<Entry>> list(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId,@RequestParam String month,@RequestParam(required=false) Direction direction,@RequestParam(required=false) Status status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return privateResponse(service.list(jwt,propertyId,month,direction,status,page,size));}
    @GetMapping("/summary") public ResponseEntity<Summary> summary(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) Long propertyId,@RequestParam String month,@RequestParam(required=false) Direction direction){return privateResponse(service.summary(jwt,propertyId,month,direction));}
    @GetMapping("/{id}") public ResponseEntity<Entry> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return privateResponse(service.detail(jwt,id));}
    @PostMapping("/{id}/post") public ResponseEntity<Entry> post(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Post input){return privateResponse(service.post(jwt,id,input));}
    @PostMapping("/{id}/cancel") public ResponseEntity<Entry> cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Cancel input){return privateResponse(service.cancel(jwt,id,input));}
    private static <T> ResponseEntity<T> privateResponse(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
}
