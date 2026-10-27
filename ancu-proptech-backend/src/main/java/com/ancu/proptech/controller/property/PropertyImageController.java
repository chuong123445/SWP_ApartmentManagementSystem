package com.ancu.proptech.controller.property;
import com.ancu.proptech.service.property.PropertyImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
@RestController @RequiredArgsConstructor
public class PropertyImageController {
    private final PropertyImageService images;
    @PostMapping("/api/v1/me/property-images") public ResponseEntity<List<PropertyImageService.Image>> upload(@AuthenticationPrincipal Jwt jwt,@RequestPart("files") List<MultipartFile> files){return ResponseEntity.status(201).body(images.upload(jwt,files));}
    @GetMapping("/api/v1/property-images/{id}") public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){
        var image=images.download(jwt,id);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType(image.contentType())).body(image.content());
    }
}
