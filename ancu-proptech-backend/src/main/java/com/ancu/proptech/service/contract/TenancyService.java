package com.ancu.proptech.service.contract;
import com.ancu.proptech.dto.contract.TenancyResponse;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service @RequiredArgsConstructor
public class TenancyService {
    private final RentalContractRepository contracts;
    private final AccountAccessService access;
    @Transactional(readOnly=true) public List<TenancyResponse> owner(Jwt jwt){return contracts.findByApartmentPropertyOwnerIdOrderByStartDateDescIdAsc(access.owner(jwt).getId()).stream().map(this::response).toList();}
    @Transactional(readOnly=true) public List<TenancyResponse> mine(Jwt jwt){return contracts.findByCustomerIdOrderByStartDateDescIdAsc(access.customer(jwt).getId()).stream().map(this::response).toList();}
    private TenancyResponse response(RentalContract c){var a=c.getApartment();var u=c.getCustomer();return new TenancyResponse(c.getId(),a.getId(),a.getRoomNumber(),a.getTitle(),a.getProperty().getName(),u.getId(),u.getFullName(),u.getEmail(),c.getStatus().name(),c.getStartDate(),c.getEndDate(),c.getMonthlyRent().toPlainString(),c.getVersion());}
}
