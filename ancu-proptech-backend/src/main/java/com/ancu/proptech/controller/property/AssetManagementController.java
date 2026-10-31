package com.ancu.proptech.controller.property;
import com.ancu.proptech.dto.apartment.*;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.service.property.AssetManagementService;
import com.ancu.proptech.service.apartment.OwnerApartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequiredArgsConstructor
public class AssetManagementController {
    private final AssetManagementService assets;private final OwnerApartmentService apartments;
    @GetMapping("/api/v1/me/properties") public ResponseEntity<List<AssetManagementService.Group>> list(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(assets.list(jwt));}
    @PatchMapping("/api/v1/me/apartments/{id}") public ResponseEntity<Void> update(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody ApartmentInformationUpdate input){assets.update(jwt,id,input);return empty();}
    @PatchMapping("/api/v1/me/apartments/{id}/prices") public ResponseEntity<OwnerApartmentResponse> prices(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody ApartmentPrices input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(apartments.prices(jwt,id,input));}
    @PutMapping("/api/v1/me/properties/{id}/images") public ResponseEntity<Void> images(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody PropertyGalleryUpdate input){assets.gallery(jwt,id,input);return empty();}
    private ResponseEntity<Void> empty(){return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();}
}
