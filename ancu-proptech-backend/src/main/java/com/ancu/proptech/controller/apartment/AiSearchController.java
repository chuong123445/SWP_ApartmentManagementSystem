package com.ancu.proptech.controller.apartment;
import static com.ancu.proptech.dto.apartment.AiSearchDtos.*;
import com.ancu.proptech.service.apartment.AiSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import jakarta.validation.Valid;
@RestController @RequiredArgsConstructor
public class AiSearchController {
 private final AiSearchService service;
 @PostMapping("/api/v1/apartments/ai-chat") public ResponseEntity<ChatResult> chat(@Valid @RequestBody ChatRequest input,jakarta.servlet.http.HttpServletRequest request){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.chat(input,request.getRemoteAddr()));}
 @PostMapping("/api/v1/apartments/ai-search") public ResponseEntity<Result> suggest(@Valid @RequestBody Request input,jakarta.servlet.http.HttpServletRequest request){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.suggest(input,request.getRemoteAddr()));}
 @PostMapping("/api/v1/apartments/ai-search/{id}/apply") public ResponseEntity<Filters> apply(@PathVariable String id,@Valid @RequestBody Apply input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.apply(id,input.filters()));}
}
