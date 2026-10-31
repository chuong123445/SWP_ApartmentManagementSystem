package com.ancu.proptech.controller.apartment;
import com.ancu.proptech.dto.apartment.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.service.apartment.ApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController @RequestMapping("/api/v1/apartments") @RequiredArgsConstructor
public class ApartmentController {
    private final ApartmentService apartments;
    @GetMapping
    public PageResponse<ApartmentSummary> list(@RequestParam(required = false) String q, @RequestParam(required = false) String city,
        @RequestParam(required = false) String district, @RequestParam(required = false) String ward, @RequestParam(required = false) BigDecimal minRent,
        @RequestParam(required = false) BigDecimal maxRent, @RequestParam(required = false) Integer bedrooms,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "6") int size) {
        return apartments.search(q, city, district, ward, minRent, maxRent, bedrooms, page, size);
    }
    @GetMapping("/{id}") public org.springframework.http.ResponseEntity<ApartmentDetail> detail(@PathVariable Long id,@org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt) { return org.springframework.http.ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore()).body(apartments.detail(id,jwt)); }
    @GetMapping("/address-options") public java.util.List<AddressOption> addresses(){return apartments.addressOptions();}
}
