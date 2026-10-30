package com.ancu.proptech.service.contract;

import com.ancu.proptech.dto.contract.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.model.property.PropertyDossier;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.repository.property.PropertyDossierRepository;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.*;
import com.ancu.proptech.repository.identity.IdentityProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class ContractDraftService {
    private final ContractDraftRepository drafts;
    private final RentalContractRepository contracts;
    private final RentalRequestRepository requests;
    private final ApartmentRepository apartments;
    private final PropertyDossierRepository dossiers;
    private final com.ancu.proptech.service.property.PropertyPaymentQrResolver paymentQrResolver;
    private final com.ancu.proptech.repository.property.PropertySettingsRepository propertySettings;
    private final AccountAccessService access;
    private final AccountVerificationPolicy verification;
    private final IdentityProfileRepository identities;
    private final com.ancu.proptech.repository.auth.ExternalIdentityRepository verifiedIdentities;
    private final ObjectMapper json;
    private final com.ancu.proptech.service.property.PropertyRightsPolicy rights;
    private final ContractHandoverRepository handovers;
    private final com.ancu.proptech.repository.billing.RentalInvoiceRepository invoices;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

    // The parent request row serializes create/reopen for the same accepted selection.
    @Transactional
    public ContractContextResponse context(Jwt jwt,Long requestId) {
        var owner=access.owner(jwt);
        var request=requests.findForOwnerUpdate(requestId,owner.getId()).orElseThrow(ContractDraftService::notFound);
        if(request.getStatus()!=RentalRequest.Status.ACCEPTED) throw conflict("REQUEST_NOT_ACCEPTED","Chỉ tạo hợp đồng từ yêu cầu đã chấp nhận.");
        var existing=drafts.findByRentalRequestId(requestId).orElse(null);
        var a=request.getApartment();
        var snapshot=snapshot(request);
        return new ContractContextResponse(requestId,request.getVersion(),sourceVersion(request,snapshot),snapshot,
            a.getAdvertisedMonthlyRent().toPlainString(),a.getDeposit()==null?null:a.getDeposit().toPlainString(),
            ContractTemplates.apartment(),existing==null?null:response(existing),a.getProperty().getRightsValidFrom(),a.getProperty().getRightsValidUntil(),suggestedRates(a));
    }

    @Transactional
    public ContractDraftResponse create(Jwt jwt,Long requestId,ContractDraftCreate input) {
        var owner=access.owner(jwt);
        var r=requests.findForOwnerUpdate(requestId,owner.getId()).orElseThrow(ContractDraftService::notFound);
        if(r.getVersion()!=input.getRequestVersion()) throw stale();
        if(r.getStatus()!=RentalRequest.Status.ACCEPTED) throw conflict("REQUEST_NOT_ACCEPTED","Chỉ tạo hợp đồng từ yêu cầu đã chấp nhận.");
        if(drafts.findByRentalRequestId(requestId).isPresent()) throw conflict("CONTRACT_ALREADY_EXISTS","Yêu cầu này đã có hợp đồng. Hãy mở bản đã lưu.");
        var a=apartments.findForRequest(r.getApartment().getId()).orElseThrow(ContractDraftService::notFound);
        if(a.getAvailability()!=Apartment.Availability.CONTRACT_IN_PROGRESS || contracts.findByApartmentId(a.getId()).stream().anyMatch(c->c.getStatus()!=RentalContract.Status.ENDED))
            throw conflict("APARTMENT_NOT_SELECTED","Căn hộ không còn ở bước làm hợp đồng hoặc đã có hợp đồng hiện hành.");
        var customer=r.getCustomer();
        if((customer.getRole()!=AuthAccount.Role.CUSTOMER&&customer.getRole()!=AuthAccount.Role.OWNER) || customer.getStatus()!=AuthAccount.Status.ACTIVE || !verification.isRentalVerified(customer))
            throw conflict("CUSTOMER_NOT_ELIGIBLE","Tài khoản khách thuê không còn đủ điều kiện.");
        rights.requireCurrent(a.getProperty());
        var snapshot=snapshot(r);
        if(!sourceVersion(r,snapshot).equals(input.getSourceVersion())) throw conflict("SOURCE_CHANGED","Thông tin hai bên hoặc căn hộ đã thay đổi. Hãy mở lại để rà soát.");
        validateTerms(input);
        rights.contract(a.getProperty(),input.getStartDate(),input.getEndDate());
        var c=new RentalContract();c.setApartment(a);c.setCustomer(customer);c.setStatus(RentalContract.Status.DRAFT);
        applyContract(c,input);contracts.saveAndFlush(c);
        var d=new ContractDraft();d.setContract(c);d.setRentalRequest(r);d.setSnapshotJson(json.writeValueAsString(snapshot));
        d.setCreatedAt(Instant.now());applyDraft(d,input);
        return response(drafts.saveAndFlush(d)); // No availability/baseline/signature/payment transition.
    }

    @Transactional(readOnly=true)
    public List<ContractDraftResponse> ownerList(Jwt jwt,Long propertyId) {
        return drafts.findByContractApartmentPropertyOwnerIdOrderByCreatedAtDescIdDesc(access.owner(jwt).getId()).stream()
            .filter(d->propertyId==null || d.getContract().getApartment().getProperty().getId().equals(propertyId)).map(this::response).toList();
    }
    @Transactional(readOnly=true)
    public List<ContractDraftResponse> customerList(Jwt jwt) {
        return drafts.findByContractCustomerIdOrderByCreatedAtDescIdDesc(access.customer(jwt).getId()).stream().map(this::response).toList();
    }
    @Transactional(readOnly=true)
    public ContractDraftResponse get(Jwt jwt,Long id) {
        var account=access.account(jwt);
        var d=drafts.findByContractId(id).orElseThrow(ContractDraftService::notFound);
        var c=d.getContract();
        if(!c.getApartment().getProperty().getOwner().getId().equals(account.getId()) && !c.getCustomer().getId().equals(account.getId())) throw notFound();
        return response(d);
    }
    @Transactional
    public ContractDraftResponse update(Jwt jwt,Long id,ContractDraftUpdate input) {
        var owner=access.owner(jwt);
        var requestId=drafts.findRequestId(id).orElseThrow(ContractDraftService::notFound);
        requests.findForOwnerUpdate(requestId,owner.getId()).orElseThrow(ContractDraftService::notFound);
        var d=drafts.findByContractId(id).orElseThrow(ContractDraftService::notFound);
        var c=contracts.lockById(id).orElseThrow(ContractDraftService::notFound);
        if(d.getContentVersion()!=input.getVersion()) throw stale();
        if(c.getStatus()!=RentalContract.Status.DRAFT) throw conflict("CONTRACT_NOT_DRAFT","Chỉ bản nháp mới được chỉnh sửa.");
        if(d.getOwnerSignedAt()!=null || d.getCustomerSignedAt()!=null)
            throw conflict("CONTRACT_SIGNED_CONTENT","Nội dung đã có chữ ký và không thể chỉnh sửa.");
        validateTerms(input);
        if(c.getRenewalOfContractId()!=null) {
            var previous=contracts.findById(c.getRenewalOfContractId()).orElseThrow(ContractDraftService::notFound);
            if(!input.getStartDate().isAfter(previous.getEndDate())) throw conflict("RENEWAL_OVERLAP","Ngày bắt đầu kỳ mới phải sau ngày kết thúc hợp đồng cũ.");
        }
        rights.contract(c.getApartment().getProperty(),input.getStartDate(),input.getEndDate());applyContract(c,input);applyDraft(d,input);
        // Content version is independent of the meter billing chain version.
        d.setContentVersion(d.getContentVersion()+1);
        contracts.saveAndFlush(c);drafts.saveAndFlush(d);
        return response(d);
    }

    @Transactional
    public ContractDraftResponse sign(Jwt jwt,Long id,ContractSignatureRequest input) {
        var account=access.account(jwt);
        var d=drafts.findByContractId(id).orElseThrow(ContractDraftService::notFound);
        var c=d.getContract();
        Long ownerId=c.getApartment().getProperty().getOwner().getId();
        boolean owner=ownerId.equals(account.getId());
        if(!owner && !c.getCustomer().getId().equals(account.getId())) throw notFound();
        if(c.getRenewalOfContractId()!=null) {
            var parentRequestId=drafts.findRequestId(c.getRenewalOfContractId()).orElseThrow(ContractDraftService::notFound);
            requests.findForOwnerUpdate(parentRequestId,ownerId).orElseThrow(ContractDraftService::notFound);
        }
        // Same lock order as editing: parent selection, then contract. No party can sign for the other.
        requests.findForOwnerUpdate(d.getRentalRequest().getId(),ownerId).orElseThrow(ContractDraftService::notFound);
        c=contracts.lockById(id).orElseThrow(ContractDraftService::notFound);
        // Refresh after acquiring the lock so a concurrent signature is not overwritten.
        d=drafts.findByContractId(id).orElseThrow(ContractDraftService::notFound);
        entityManager.refresh(c);entityManager.refresh(d);
        if(c.getStatus()!=RentalContract.Status.DRAFT) throw conflict("CONTRACT_NOT_DRAFT","Hợp đồng không còn ở bước ký.");
        if(input.version()!=d.getContentVersion() || !contentHash(d).equals(input.contentHash())) throw stale();
        if(!input.consent()) throw new ApiException(HttpStatus.BAD_REQUEST,"CONSENT_REQUIRED","Bạn cần đồng ý nội dung trước khi ký.");
        if((owner && d.getOwnerSignedAt()!=null) || (!owner && d.getCustomerSignedAt()!=null))
            throw conflict("ALREADY_SIGNED","Bạn đã ký hợp đồng này.");
        var apartment=apartments.findForRequest(c.getApartment().getId()).orElseThrow(ContractDraftService::notFound);
        var landlord=apartment.getProperty().getOwner();
        if(landlord.getStatus()!=AuthAccount.Status.ACTIVE || landlord.getRole()!=AuthAccount.Role.OWNER || !verification.isVerified(landlord))
            throw conflict("OWNER_NOT_ELIGIBLE","Chủ nhà không còn đủ điều kiện ký hợp đồng.");
        rights.requireCurrent(apartment.getProperty());
        rights.contract(apartment.getProperty(),c.getStartDate(),c.getEndDate());
        if(c.getEndDate().isBefore(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))))
            throw conflict("CONTRACT_EXPIRED","Thời hạn hợp đồng đã kết thúc.");
        var customer=c.getCustomer();
        if(customer.getStatus()!=AuthAccount.Status.ACTIVE || !verification.isRentalVerified(customer))
            throw conflict("CUSTOMER_NOT_ELIGIBLE","Khách thuê không còn đủ điều kiện ký.");
        RentalContract previous=null;
        if(c.getRenewalOfContractId()!=null) {
            previous=contracts.lockById(c.getRenewalOfContractId()).orElseThrow(ContractDraftService::notFound);
            entityManager.refresh(previous);
            if(previous.getStatus()!=RentalContract.Status.ACTIVE || !previous.getEndDate().isBefore(rights.today()) ||
                handovers.existsByContractIdAndStatus(previous.getId(),ContractHandover.Status.PENDING))
                throw conflict("RENEWAL_UNAVAILABLE","Hợp đồng cũ không còn đủ điều kiện ký tiếp.");
        }
        byte[] signature=SignatureImage.normalize(input.signature());
        if(owner){d.setOwnerSignature(signature);d.setOwnerSignedAt(Instant.now());}
        else {d.setCustomerSignature(signature);d.setCustomerSignedAt(Instant.now());}
        d.setSignedContentHash(contentHash(d));
        if(d.getOwnerSignedAt()!=null && d.getCustomerSignedAt()!=null) {
            if(apartment.getAvailability()!=(previous==null?Apartment.Availability.CONTRACT_IN_PROGRESS:Apartment.Availability.OCCUPIED))
                throw conflict("APARTMENT_NOT_SELECTED","Căn hộ không còn ở bước làm hợp đồng.");
            Long previousId=c.getRenewalOfContractId();
            if(contracts.findByApartmentId(apartment.getId()).stream().anyMatch(other->!other.getId().equals(id) && !other.getId().equals(previousId) && other.getStatus()!=RentalContract.Status.ENDED))
                throw conflict("ACTIVE_CONTRACT_EXISTS","Căn hộ đã có hợp đồng khác.");
            if(previous!=null) {
                if(invoices.existsByContractIdAndStatus(previous.getId(),com.ancu.proptech.model.billing.RentalInvoice.Status.DRAFT))
                    throw conflict("OPEN_INVOICE_DRAFT","Cần xử lý hóa đơn nháp của hợp đồng cũ trước khi hoàn tất ký tiếp.");
                previous.setStatus(RentalContract.Status.ENDED);previous.setEndedAt(Instant.now());previous.setEndReason("RENEWED");
                contracts.saveAndFlush(previous); // Release the unique ACTIVE-apartment slot before activating its successor.
            }
            c.setStatus(RentalContract.Status.ACTIVE);
            // A signed agreement does not invent meter readings. Missing readings stay missing.
            if(apartment.getElectricityIndex()!=null && apartment.getWaterIndex()!=null) {
                c.setElectricityBaseline(java.math.BigDecimal.valueOf(apartment.getElectricityIndex()));
                c.setWaterBaseline(java.math.BigDecimal.valueOf(apartment.getWaterIndex()));
                c.setBaselineDate(c.getStartDate());
            }
            if(previous!=null) {
                var last=invoices.findFirstByContractIdAndStatusOrderByPeriodDesc(previous.getId(),com.ancu.proptech.model.billing.RentalInvoice.Status.SENT);
                var electric=last.map(i->i.getElectricityEndReading()).orElse(previous.getElectricityBaseline());
                var water=last.map(i->i.getWaterEndReading()).orElse(previous.getWaterBaseline());
                if(electric!=null && water!=null) {
                    c.setElectricityBaseline(electric);c.setWaterBaseline(water);c.setBaselineDate(c.getStartDate());
                }
            }
            apartment.setAvailability(Apartment.Availability.OCCUPIED);
        }
        contracts.saveAndFlush(c);drafts.saveAndFlush(d);
        return response(d);
    }
    private ContractContextResponse.SuggestedRates suggestedRates(Apartment a) {
        var s=propertySettings.findById(a.getProperty().getId()).orElse(null);
        return s==null ? new ContractContextResponse.SuggestedRates(a.getElectricityUnitPrice()==null?null:a.getElectricityUnitPrice().toPlainString(),a.getWaterUnitPrice()==null?null:a.getWaterUnitPrice().toPlainString(),"0","0","METERED")
            : new ContractContextResponse.SuggestedRates(s.getElectricityUnitPrice().toPlainString(),s.getWaterUnitPrice().toPlainString(),s.getInternetFee().toPlainString(),s.getGarbageFee().toPlainString(),s.getWaterBillingMode().name());
    }
    void validateTerms(ContractTerms t) {
        if(!t.getEndDate().isAfter(t.getStartDate())) throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_CONTRACT_DATES","Ngày kết thúc phải sau ngày bắt đầu.");
    }
    void applyContract(RentalContract c,ContractTerms t) {
        c.setStartDate(t.getStartDate());c.setEndDate(t.getEndDate());c.setMonthlyRent(t.getMonthlyRent());
        c.setWaterBillingMode(t.getWaterBillingMode());c.setOccupantCount(t.getOccupantCount());c.setInternetFee(t.getInternetFee());c.setGarbageFee(t.getGarbageFee());
        c.setElectricityUnitPrice(t.getElectricityUnitPrice());c.setWaterUnitPrice(t.getWaterUnitPrice());
    }
    void applyDraft(ContractDraft d,ContractTerms t) {
        d.setTemplateType(t.getTemplateType());
        d.setDeposit(t.getDeposit());d.setPaymentDay(t.getPaymentDay());d.setPaymentMethod(t.getPaymentMethod().strip());
        d.setUsagePurpose(t.getUsagePurpose().strip());d.setClausesJson(json.writeValueAsString(t.getClauses().stream()
            .map(c->new ContractClause(c.title().strip(),c.body().strip())).toList()));
    }
    ContractSnapshot snapshot(RentalRequest r) {
        var a=r.getApartment();var p=a.getProperty();
        var approved=dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(p.getId()).stream()
            .filter(d->d.getStatus()==PropertyDossier.Status.APPROVED).findFirst().orElse(null);
        var qr=paymentQrResolver.resolve(p);
        return new ContractSnapshot(party(p.getOwner()),party(r.getCustomer()),
            new ContractSnapshot.Asset(a.getId().toString(),p.getId().toString(),p.getName(),a.getTitle(),a.getRoomNumber(),p.getAddress(),p.getCity(),p.getDistrict(),p.getWard(),
                a.getAreaM2().toPlainString(),a.getFloor(),a.getBedrooms(),a.getBathrooms(),List.copyOf(a.getAmenities()),p.getApprovalStatus().name(),
                approved==null?null:approved.getId().toString(),approved==null?null:approved.getRightType().name(),
                approved==null?null:approved.getCertificateNumber(),approved==null?null:approved.getCertificateIssueDate(),
                approved==null?null:approved.getCertificateIssuePlace(),approved==null?null:approved.getExploitationRightDescription(),approved==null?null:approved.isLocalFixture()),
            qr!=null?new ContractSnapshot.ReceivingAccount(qr.getBank(),qr.getAccountNumber(),qr.getAccountHolderName()):approved==null?null:new ContractSnapshot.ReceivingAccount(approved.getBank(),approved.getAccountNumber(),approved.getAccountHolderName()),qr==null?null:qr.getId().toString());
    }
    private ContractSnapshot.Party party(AuthAccount a) {
        var verified=verifiedIdentities.findById(a.getId()).filter(i->"VERIFIED".equals(i.getVerificationStatus())).orElse(null);
        if(verified!=null)return new ContractSnapshot.Party(a.getId().toString(),verified.getLegalName(),a.getEmail(),a.getPhone(),verified.getAddress(),verified.getDateOfBirth(),a.isEmailVerified(),
            verified.getDocumentNumber(),null,null,null,"VERIFIED",false);
        var identity=identities.findById(a.getId()).orElse(null);
        return new ContractSnapshot.Party(a.getId().toString(),identity==null?a.getFullName():identity.getLegalName(),a.getEmail(),a.getPhone(),
            identity==null?a.getAddress():identity.getCurrentAddress(),identity==null?a.getDateOfBirth():identity.getDateOfBirth(),a.isEmailVerified(),
            identity==null?null:identity.getDocumentNumber(),identity==null?null:identity.getIssueDate(),identity==null?null:identity.getIssuePlace(),
            identity==null?null:identity.getPermanentAddress(),identity==null?null:identity.getVerificationStatus().name(),identity==null?null:identity.isLocalFixture());
    }
    String sourceVersion(RentalRequest r,ContractSnapshot s) {
        String data=json.writeValueAsString(s)+":"+r.getVersion()+":"+r.getApartment().getVersion()+":"+r.getApartment().getProperty().getVersion()
            +":"+r.getCustomer().getVersion()+":"+r.getApartment().getProperty().getOwner().getVersion();
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    ContractDraftResponse response(ContractDraft d) {
        var c=d.getContract();
        return new ContractDraftResponse(c.getId(),d.getRentalRequest().getId(),"HD-"+c.getId(),c.getStatus().name(),d.getContentVersion(),
            c.getStartDate(),c.getEndDate(),c.getMonthlyRent().toPlainString(),c.getElectricityUnitPrice().toPlainString(),c.getWaterUnitPrice().toPlainString(),
            d.getDeposit().toPlainString(),d.getPaymentDay(),d.getPaymentMethod(),d.getUsagePurpose(),
            Arrays.asList(json.readValue(d.getClausesJson(),ContractClause[].class)),json.readValue(d.getSnapshotJson(),ContractSnapshot.class),d.getCreatedAt(),
            d.getTemplateType()==null?"APARTMENT":d.getTemplateType(),
            new ContractDraftResponse.Signing(c.getApartment().getProperty().getOwner().getId().toString(),c.getCustomer().getId().toString(),contentHash(d),
                d.getOwnerSignedAt()!=null && d.getCustomerSignedAt()!=null?"SIGNED":d.getOwnerSignedAt()!=null?"WAITING_CUSTOMER":d.getCustomerSignedAt()!=null?"WAITING_OWNER":"UNSIGNED",
                d.getOwnerSignedAt(),d.getCustomerSignedAt(),image(d.getOwnerSignature()),image(d.getCustomerSignature())),lifecycle(c),c.getWaterBillingMode().name(),c.getOccupantCount(),c.getInternetFee().toPlainString(),c.getGarbageFee().toPlainString());
    }
    private ContractDraftResponse.Lifecycle lifecycle(RentalContract c) {
        var next=contracts.findByRenewalOfContractIdAndStatusNot(c.getId(),RentalContract.Status.ENDED).stream().findFirst().orElse(null);
        var h=handovers.findFirstByContractIdOrderByIdDesc(c.getId()).orElse(null);
        return new ContractDraftResponse.Lifecycle(c.getVersion(),c.getEndDate().isBefore(rights.today()),
            c.getRenewalOfContractId()==null?null:c.getRenewalOfContractId().toString(),next==null?null:next.getId().toString(),c.getEndReason(),
            h==null?null:new ContractDraftResponse.Handover(h.getId().toString(),h.getVersion(),h.getStatus().name(),h.getReturnDate(),
                h.getElectricityReading().toPlainString(),h.getWaterReading().toPlainString(),h.getElectricityStartReading()==null?null:h.getElectricityStartReading().toPlainString(),h.getWaterStartReading()==null?null:h.getWaterStartReading().toPlainString(),h.isKeysReturned(),h.getConditionNotes(),h.getDepositAmount().toPlainString(),
                h.getDeductionAmount().toPlainString(),h.getUtilityAmount().toPlainString(),h.getRefundAmount().toPlainString(),h.getExtraAmountDue().toPlainString(),h.getOwnerConfirmedAt(),h.getCustomerConfirmedAt()));
    }
    private String image(byte[] bytes){return bytes==null?null:"data:image/png;base64,"+Base64.getEncoder().encodeToString(bytes);}
    private String contentHash(ContractDraft d) {
        var c=d.getContract();
        String content=json.writeValueAsString(Arrays.asList(c.getId(),d.getContentVersion(),d.getTemplateType()==null?"APARTMENT":d.getTemplateType(),
            d.getSnapshotJson(),d.getClausesJson(),c.getStartDate(),c.getEndDate(),c.getMonthlyRent().stripTrailingZeros().toPlainString(),
            c.getElectricityUnitPrice().stripTrailingZeros().toPlainString(),c.getWaterUnitPrice().stripTrailingZeros().toPlainString(),
            d.getDeposit().stripTrailingZeros().toPlainString(),d.getPaymentDay(),d.getPaymentMethod(),d.getUsagePurpose()));
        // Legacy contracts retain the exact hash when no new charges/mode were agreed.
        if(c.getWaterBillingMode()!=com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.METERED || c.getInternetFee().signum()!=0 || c.getGarbageFee().signum()!=0)
            content+="|charges-v1|"+c.getWaterBillingMode()+"|"+c.getOccupantCount()+"|"+c.getInternetFee().stripTrailingZeros().toPlainString()+"|"+c.getGarbageFee().stripTrailingZeros().toPlainString();
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    private static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hợp đồng hoặc yêu cầu thuê."); }
    private static ApiException conflict(String code,String message) { return new ApiException(HttpStatus.CONFLICT,code,message); }
    private static ApiException stale() { return conflict("STALE_VERSION","Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu."); }
}
