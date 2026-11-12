package com.ancu.proptech.service.contract;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.service.auth.AccountVerificationPolicy;
import com.ancu.proptech.service.property.PropertyRightsPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import java.time.Instant;

@Service @RequiredArgsConstructor
public class ContractRenewalActivationService {
    private final ContractExitGuard exitGuard;
    private final RentalContractRepository contracts;
    private final ContractDraftRepository drafts;
    private final ContractHandoverRepository handovers;
    private final RentalRequestRepository requests;
    private final ApartmentRepository apartments;
    private final RentalInvoiceRepository invoices;
    private final PropertyRightsPolicy rights;
    private final AccountVerificationPolicy verification;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entities;

    @Transactional
    public void activate(Long id) {
        var d=drafts.findByContractId(id).orElseThrow();var c=d.getContract();
        if(c.getRenewalOfContractId()==null)return;
        var oldDraft=drafts.findByContractId(c.getRenewalOfContractId()).orElseThrow();
        Long owner=c.getApartment().getProperty().getOwner().getId();
        requests.findForOwnerUpdate(oldDraft.getRentalRequest().getId(),owner).orElseThrow();
        exitGuard.requireOpen(c.getRenewalOfContractId());
        requests.findForOwnerUpdate(d.getRentalRequest().getId(),owner).orElseThrow();
        contracts.lockById(id).orElseThrow();entities.refresh(c);entities.refresh(d);
        if(c.getStatus()!=RentalContract.Status.DRAFT)return;
        if(d.getOwnerSignedAt()==null||d.getCustomerSignedAt()==null||c.getStartDate().isAfter(rights.today()))return;
        var previous=contracts.lockById(c.getRenewalOfContractId()).orElseThrow();entities.refresh(previous);
        if(previous.getStatus()!=RentalContract.Status.ACTIVE||!previous.getEndDate().isBefore(rights.today())||!c.getStartDate().isAfter(previous.getEndDate())||c.getEndDate().isBefore(rights.today()))throw blocked();
        if(handovers.existsByContractIdAndStatus(previous.getId(),ContractHandover.Status.PENDING)||invoices.existsByContractIdAndStatus(previous.getId(),RentalInvoice.Status.DRAFT))throw blocked();
        var a=apartments.findForRequest(c.getApartment().getId()).orElseThrow();
        if(a.getAvailability()!=Apartment.Availability.OCCUPIED||contracts.findByApartmentId(a.getId()).stream().anyMatch(other->!other.getId().equals(id)&&!other.getId().equals(previous.getId())&&other.isOpen()))throw blocked();
        var landlord=a.getProperty().getOwner();
        if(landlord.getStatus()!=AuthAccount.Status.ACTIVE||!landlord.hasRole(AuthAccount.Role.OWNER)||!verification.isVerified(landlord)||c.getCustomer().getStatus()!=AuthAccount.Status.ACTIVE||!verification.isRentalVerified(c.getCustomer()))throw blocked();
        rights.contract(a.getProperty(),c.getStartDate(),c.getEndDate());
        previous.setStatus(RentalContract.Status.ENDED);previous.setEndedAt(Instant.now());previous.setEndReason("RENEWED");contracts.saveAndFlush(previous);
        var last=invoices.findFirstByContractIdAndKindNotAndStatusOrderByPeriodDesc(previous.getId(),RentalInvoice.Kind.RENT,RentalInvoice.Status.SENT);
        var electric=last.map(i->i.getElectricityEndReading()).orElse(previous.getElectricityBaseline());
        var water=last.map(i->i.getWaterEndReading()).orElse(previous.getWaterBaseline());
        if(electric!=null&&water!=null){c.setElectricityBaseline(electric);c.setWaterBaseline(water);c.setBaselineDate(c.getStartDate());}
        c.setStatus(RentalContract.Status.ACTIVE);contracts.saveAndFlush(c);
    }
    private static ApiException blocked(){return new ApiException(HttpStatus.CONFLICT,"RENEWAL_ACTIVATION_BLOCKED","Chưa thể chuyển kỳ thuê. Cần kiểm tra hợp đồng cũ, quyền thuê, tài khoản và hóa đơn nháp.");}
}
