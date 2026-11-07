package com.ancu.proptech.service.owner;

import com.ancu.proptech.dto.owner.OwnerWorkspaceSummary;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.repository.payment.TestPaymentRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.property.PropertyRightsPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class OwnerWorkspaceSummaryService {
    // Matches the existing 20/10-day contract expiry reminder windows, not the D-10 renewal command gate.
    private static final int EXPIRING_DAYS = 20;
    private final AccountAccessService access;
    private final PropertyRepository properties;
    private final RentalInvoiceRepository invoices;
    private final TestPaymentRepository additionalReceipts;
    private final RentalContractRepository contracts;
    private final PropertyRightsPolicy dates;

    @Transactional(readOnly=true)
    public OwnerWorkspaceSummary read(Jwt jwt, Long propertyId) {
        var ownerId = access.owner(jwt).getId();
        if (propertyId != null) properties.findById(propertyId).filter(p -> p.getOwner().getId().equals(ownerId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy tài sản thuộc tài khoản của bạn."));
        var today = dates.today();var through = today.plusDays(EXPIRING_DAYS);
        long monthly = invoices.countOwnerHistory(ownerId,propertyId,RentalInvoice.Status.SENT,false);
        long additional = additionalReceipts.countOwnerReceived(ownerId,propertyId,false);
        return new OwnerWorkspaceSummary(propertyId,today,through,monthly,additional,monthly+additional,
                contracts.countExpiring(ownerId,propertyId,today,through),contracts.countExpired(ownerId,propertyId,today));
    }
}
