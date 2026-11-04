package com.ancu.proptech.service.contract;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.contract.RenewalInboxItem;
import com.ancu.proptech.model.contract.ContractRenewalRequest;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.apartment.ApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.oauth2.jwt.Jwt;

@Service @RequiredArgsConstructor
public class ContractRenewalInboxService {
    private final AccountAccessService access;
    private final ContractRenewalRequestRepository requests;
    private final RentalContractRepository contracts;
    @Transactional(readOnly=true)
    public PageResponse<RenewalInboxItem> inbox(Jwt jwt,Long propertyId,ContractRenewalRequest.Status status,int page,int size) {
        var owner=access.owner(jwt);ApartmentService.validatePage(page,size);
        return PageResponse.from(requests.inbox(owner.getId(),propertyId,status,PageRequest.of(page,size)).map(r->{
            var c=contracts.findById(r.getContractId()).orElseThrow();var a=c.getApartment();var p=a.getProperty();
            var successors=contracts.findByRenewalOfContractIdOrderByIdDesc(c.getId());var next=successors.isEmpty()?null:successors.getFirst();
            return new RenewalInboxItem(r.getId().toString(),c.getId().toString(),"HD-"+c.getId(),a.getId().toString(),a.getTitle(),a.getRoomNumber(),p.getId().toString(),p.getName(),c.getCustomer().getFullName(),c.getCustomer().getEmail(),
                c.getStartDate(),c.getEndDate(),c.getMonthlyRent().toPlainString(),r.getStatus().name(),r.getMessage(),r.getDecisionReason(),r.getCreatedAt(),r.getDecidedAt(),r.getVersion(),next==null?null:next.getId().toString(),next==null?null:next.getStatus().name());
        }));
    }
}
