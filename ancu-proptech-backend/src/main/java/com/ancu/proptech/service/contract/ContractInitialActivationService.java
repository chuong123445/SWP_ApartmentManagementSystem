package com.ancu.proptech.service.contract;

import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.contract.ContractDraftRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.AccountVerificationPolicy;
import com.ancu.proptech.service.property.PropertyRightsPolicy;
import com.ancu.proptech.service.rental.SelectionCancellationGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A fully signed first lease reserves its apartment until its agreed start date. */
@Service @RequiredArgsConstructor
public class ContractInitialActivationService {
    private final com.ancu.proptech.service.billing.InvoiceService rentInvoices;
    private final ContractDraftRepository drafts;
    private final RentalContractRepository contracts;
    private final RentalRequestRepository requests;
    private final ApartmentRepository apartments;
    private final SelectionCancellationGuard cancellations;
    private final AccountVerificationPolicy verification;
    private final PropertyRightsPolicy rights;
    private final jakarta.persistence.EntityManager entities;

    @Transactional
    public void activate(Long id) {
        var draft=drafts.findByContractId(id).orElseThrow();var contract=draft.getContract();
        if(contract.getRenewalOfContractId()!=null)return;
        var ownerId=contract.getApartment().getProperty().getOwner().getId();
        var request=requests.findForOwnerUpdate(draft.getRentalRequest().getId(),ownerId).orElseThrow();
        contracts.lockById(id).orElseThrow();entities.refresh(request);entities.refresh(contract);entities.refresh(draft);
        if(contract.getStatus()!=RentalContract.Status.DRAFT)return;
        if(draft.getOwnerSignedAt()==null||draft.getCustomerSignedAt()==null||contract.getStartDate().isAfter(rights.today()))return;
        cancellations.requireOpen(request.getId());
        if(request.getStatus()!=RentalRequest.Status.ACCEPTED||contract.getEndDate().isBefore(rights.today()))throw blocked();
        var apartment=apartments.findForRequest(contract.getApartment().getId()).orElseThrow();entities.refresh(apartment);
        if(apartment.getAvailability()!=Apartment.Availability.CONTRACT_IN_PROGRESS||contracts.findByApartmentId(apartment.getId()).stream().anyMatch(other->!other.getId().equals(id)&&other.isOpen()))throw blocked();
        var landlord=apartment.getProperty().getOwner();var customer=contract.getCustomer();
        if(landlord.getStatus()!=AuthAccount.Status.ACTIVE||!landlord.hasRole(AuthAccount.Role.OWNER)||!verification.isVerified(landlord)||customer.getStatus()!=AuthAccount.Status.ACTIVE||!verification.isRentalVerified(customer))throw blocked();
        rights.contract(apartment.getProperty(),contract.getStartDate(),contract.getEndDate());
        if(apartment.getElectricityIndex()!=null&&apartment.getWaterIndex()!=null){
            contract.setElectricityBaseline(java.math.BigDecimal.valueOf(apartment.getElectricityIndex()));
            contract.setWaterBaseline(java.math.BigDecimal.valueOf(apartment.getWaterIndex()));contract.setBaselineDate(contract.getStartDate());
        }
        contract.setStatus(RentalContract.Status.ACTIVE);apartment.setAvailability(Apartment.Availability.OCCUPIED);
        contracts.saveAndFlush(contract);apartments.flush();
        if(contract.isOneMonthRentPackage())rentInvoices.prepareInitialOneMonthRent(contract.getId());
    }
    private static ApiException blocked(){return new ApiException(HttpStatus.CONFLICT,"CONTRACT_ACTIVATION_BLOCKED","Chưa thể chuyển hiệu lực. Cần kiểm tra lựa chọn thuê, phòng, tài khoản và quyền cho thuê.");}
}
