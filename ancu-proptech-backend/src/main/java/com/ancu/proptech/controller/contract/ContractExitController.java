package com.ancu.proptech.controller.contract;
import static com.ancu.proptech.dto.contract.ContractExitDtos.*;
import com.ancu.proptech.service.contract.ContractExitService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/contracts/{id}/exit")
public class ContractExitController {
 private final ContractExitService service;
 @GetMapping public ResponseEntity<View> get(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.get(jwt,id));}
 @PostMapping("/actions") public ResponseEntity<View> act(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@jakarta.validation.Valid @RequestBody Command input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.act(jwt,id,input));}
 @PostMapping("/sign") public ResponseEntity<View> sign(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@jakarta.validation.Valid @RequestBody SignInput input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.sign(jwt,id,input));}
 @GetMapping("/pdf") public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header("Content-Disposition","inline; filename=\"BBBG-HD-"+id+".pdf\"").contentType(MediaType.APPLICATION_PDF).body(service.pdf(jwt,id));}
 @PostMapping(value="/evidence",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<Evidence> upload(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@RequestPart MultipartFile file)throws java.io.IOException{return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.upload(jwt,id,file));}
 @GetMapping("/evidence/{evidenceId}") public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@PathVariable Long evidenceId){var content=service.download(jwt,id,evidenceId);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header("Content-Disposition","attachment; filename=\"evidence\"").contentType(MediaType.parseMediaType(content.contentType())).body(content.bytes());}
}
