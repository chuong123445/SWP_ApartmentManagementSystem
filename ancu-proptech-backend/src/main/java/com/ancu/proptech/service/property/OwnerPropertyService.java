package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.OwnerPropertyResponse;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service @RequiredArgsConstructor
public class OwnerPropertyService {
    private final PropertyRepository properties;
    private final AccountAccessService access;
    @Transactional(readOnly = true)
    public List<OwnerPropertyResponse> list(Jwt jwt) {
        var owner = access.owner(jwt);
        return properties.findByOwnerIdOrderByNameAscIdAsc(owner.getId()).stream()
                .map(p -> new OwnerPropertyResponse(p.getId(), p.getName(), p.getAddress(), p.getApprovalStatus().name())).toList();
    }
}
