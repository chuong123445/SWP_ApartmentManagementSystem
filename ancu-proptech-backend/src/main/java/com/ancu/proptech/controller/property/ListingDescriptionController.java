package com.ancu.proptech.controller.property;
import static com.ancu.proptech.dto.property.ListingDescriptionDtos.*;
import com.ancu.proptech.service.property.ListingDescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class ListingDescriptionController {
    private final ListingDescriptionService service;
    @PostMapping("/api/v1/me/listing-description/suggest")
    public Suggestion suggest(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ListingFacts facts){return service.suggest(jwt,facts);}
}
