package com.ancu.proptech.controller.property;
import static com.ancu.proptech.dto.property.PropertyListingDtos.*;
import com.ancu.proptech.service.property.PropertyListingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/me/listing-drafts") @RequiredArgsConstructor
public class PropertyListingController {
    private final PropertyListingService service;
    @PostMapping public ResponseEntity<View> start(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Start input){return response(service.start(jwt,input));}
    @GetMapping public ResponseEntity<List<View>> list(@AuthenticationPrincipal Jwt jwt){return response(service.list(jwt));}
    @GetMapping("/{id}") public ResponseEntity<View> get(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return response(service.get(jwt,id));}
    @PutMapping("/{id}") public ResponseEntity<View> save(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Save input){return response(service.save(jwt,id,input));}
    @PostMapping("/{id}/complete") public ResponseEntity<View> finish(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Finish input){return response(service.finish(jwt,id,input));}
    private static <T>ResponseEntity<T> response(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
}
