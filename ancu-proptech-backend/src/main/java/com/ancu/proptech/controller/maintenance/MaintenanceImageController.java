package com.ancu.proptech.controller.maintenance;
import static com.ancu.proptech.dto.maintenance.MaintenanceDtos.*;
import com.ancu.proptech.service.maintenance.MaintenanceImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
@RestController @RequiredArgsConstructor
public class MaintenanceImageController {
 private final MaintenanceImageService service;
 @PostMapping("/api/v1/maintenance-tickets/{id}/images")
 public Image upload(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@RequestParam Kind kind,@RequestPart MultipartFile file)throws java.io.IOException{return service.upload(jwt,id,kind,file);}
 @GetMapping("/api/v1/maintenance-images/{id}")
 public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){var result=service.download(jwt,id);return ResponseEntity.ok().header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType(result.contentType())).body(result.content());}
}
