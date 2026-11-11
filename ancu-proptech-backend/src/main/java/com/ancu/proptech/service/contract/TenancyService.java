package com.ancu.proptech.service.contract;
import com.ancu.proptech.dto.contract.TenancyResponse;
import com.ancu.proptech.dto.contract.TenancyTerms;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.repository.contract.ContractDraftRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.auth.VerifiedIdentityPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;
@Service @RequiredArgsConstructor
public class TenancyService {
    private final RentalContractRepository contracts;
    private final AccountAccessService access;
    private final ContractDraftRepository drafts;
    private final VerifiedIdentityPolicy identities;

    @Transactional(readOnly=true) public List<TenancyResponse> owner(Jwt jwt){return responses(contracts.findByApartmentPropertyOwnerIdOrderByStartDateDescIdAsc(access.owner(jwt).getId()));}
    @Transactional(readOnly=true) public List<TenancyResponse> mine(Jwt jwt){return responses(contracts.findByCustomerIdOrderByStartDateDescIdAsc(access.customer(jwt).getId()));}

    private List<TenancyResponse> responses(List<RentalContract> scoped) {
        if (scoped.isEmpty()) return List.of();
        // Only query authoring terms for contract IDs selected by the authorized owner/Self scope.
        var terms = drafts.findTenancyTerms(scoped.stream().map(RentalContract::getId).toList()).stream()
                .collect(Collectors.toMap(TenancyTerms::contractId, value -> value));
        Map<Long, Optional<String>> identitySources = new HashMap<>();
        return scoped.stream().map(c -> {
            var a = c.getApartment();var u = c.getCustomer();var saved = terms.get(c.getId());
            var source = identitySources.computeIfAbsent(u.getId(), id -> identities.verified(id).map(value -> value.getSource()));
            return new TenancyResponse(c.getId(),a.getId(),a.getRoomNumber(),a.getTitle(),a.getProperty().getName(),
                    u.getId(),u.getFullName(),u.getEmail(),c.getStatus().name(),c.getStartDate(),c.getEndDate(),c.getMonthlyRent().toPlainString(),c.getVersion(),
                    u.isEmailVerified(),source.isPresent()?"VERIFIED":"NOT_VERIFIED",source.orElse(null),
                    saved == null ? null : saved.deposit().toPlainString(),saved == null ? "NO_DATA" : saved.signingStatus(),c.isLocalFixture(),c.getRentCycleMonths());
        }).toList();
    }
}
