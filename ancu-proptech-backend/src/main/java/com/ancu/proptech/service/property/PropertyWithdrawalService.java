package com.ancu.proptech.service.property;

import com.ancu.proptech.model.property.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service @RequiredArgsConstructor
public class PropertyWithdrawalService {
    public record Input(@NotNull @PositiveOrZero Long version) {}
    private final AccountAccessService access;
    private final AuthAccountRepository accounts;
    private final PropertyRepository properties;
    private final PropertyDossierRepository dossiers;
    private final PropertyListingDraftRepository drafts;
    private final ApartmentRepository apartments;
    private final com.ancu.proptech.repository.rental.RentalRequestRepository rentalRequests;
    private final com.ancu.proptech.repository.contract.RentalContractRepository contracts;
    private final jakarta.persistence.EntityManager em;

    @Transactional public void withdraw(Jwt jwt,Long id,Input input){
        var actor=access.account(jwt);
        if(!actor.hasRole(com.ancu.proptech.model.auth.AuthAccount.Role.OWNER)&&!actor.hasRole(com.ancu.proptech.model.auth.AuthAccount.Role.CUSTOMER))
            throw new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ người nộp hồ sơ được rút hồ sơ của mình.");
        accounts.findForIdentityUpdate(actor.getId()).orElseThrow(PropertyWithdrawalService::missing);
        var p=properties.findOwnedForCreation(id,actor.getId()).orElseThrow(PropertyWithdrawalService::missing);
        em.refresh(p);
        if(p.getApprovalStatus()==Property.ApprovalStatus.WITHDRAWN)return;
        if(p.getVersion()!=input.version())throw conflict("STALE_VERSION","Hồ sơ đã thay đổi. Hãy tải lại trước khi xóa hoặc rút.");
        if(p.getApprovalStatus()==Property.ApprovalStatus.APPROVED||p.getApprovedRightsDossierId()!=null)
            throw conflict("PROPERTY_ALREADY_APPROVED","Không thể xóa tài sản đã được duyệt bằng thao tác rút hồ sơ.");
        var units=apartments.findByPropertyIdOrderByIdAsc(id);
        if(units.stream().anyMatch(a->a.getPublicationStatus()!=Apartment.PublicationStatus.DRAFT||a.getAvailability()!=Apartment.Availability.VACANT||rentalRequests.existsByApartmentId(a.getId())||!contracts.findByApartmentId(a.getId()).isEmpty()))
            throw conflict("PROPERTY_IN_USE","Tài sản có căn hộ đã được đăng hoặc có hoạt động cho thuê, không thể rút hồ sơ.");
        // Same account -> property -> dossier lock order as Admin review. Preserve submitted evidence/history.
        for(var item:dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(id)){
            var d=dossiers.lockById(item.getId()).orElseThrow();em.refresh(d);
            if(d.getStatus()==PropertyDossier.Status.APPROVED)throw conflict("PROPERTY_ALREADY_APPROVED","Hồ sơ đã được duyệt, không thể rút.");
            if(d.getStatus()==PropertyDossier.Status.PENDING_APPROVAL){d.setStatus(PropertyDossier.Status.WITHDRAWN);d.setReviewReason("Người nộp đã rút hồ sơ trước khi được duyệt.");}
        }
        drafts.findById(id).ifPresent(d->{d.setCompleted(true);d.setUpdatedAt(Instant.now());});
        p.setApprovalStatus(Property.ApprovalStatus.WITHDRAWN);p.setWithdrawnAt(Instant.now());properties.flush();dossiers.flush();drafts.flush();
    }
    private static ApiException conflict(String code,String message){return new ApiException(HttpStatus.CONFLICT,code,message);}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hồ sơ thuộc tài khoản của bạn.");}
}
