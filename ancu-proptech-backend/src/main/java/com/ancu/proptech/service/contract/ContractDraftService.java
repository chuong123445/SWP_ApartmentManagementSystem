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
    private final AccountAccessService access;
    private final AccountVerificationPolicy verification;
    private final IdentityProfileRepository identities;
    private final ObjectMapper json;
    private final com.ancu.proptech.service.property.PropertyRightsPolicy rights;

    // The parent request row serializes create/reopen for the same accepted selection.
    @Transactional
    public ContractContextResponse context(Jwt jwt,UUID requestId) {
        var owner=access.owner(jwt);
        var request=requests.findForOwnerUpdate(requestId,owner.getId()).orElseThrow(ContractDraftService::notFound);
        if(request.getStatus()!=RentalRequest.Status.ACCEPTED) throw conflict("REQUEST_NOT_ACCEPTED","Chỉ tạo hợp đồng từ yêu cầu đã chấp nhận.");
        var existing=drafts.findByRentalRequestId(requestId).orElse(null);
        var a=request.getApartment();
        var snapshot=snapshot(request);
        return new ContractContextResponse(requestId,request.getVersion(),sourceVersion(request,snapshot),snapshot,
            a.getAdvertisedMonthlyRent().toPlainString(),a.getDeposit()==null?null:a.getDeposit().toPlainString(),
            ContractTemplates.apartment(),existing==null?null:response(existing));
    }

    @Transactional
    public ContractDraftResponse create(Jwt jwt,UUID requestId,ContractDraftCreate input) {
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
    public List<ContractDraftResponse> ownerList(Jwt jwt,UUID propertyId) {
        return drafts.findByContractApartmentPropertyOwnerIdOrderByCreatedAtDescIdDesc(access.owner(jwt).getId()).stream()
            .filter(d->propertyId==null || d.getContract().getApartment().getProperty().getId().equals(propertyId)).map(this::response).toList();
    }
    @Transactional(readOnly=true)
    public List<ContractDraftResponse> customerList(Jwt jwt) {
        return drafts.findByContractCustomerIdOrderByCreatedAtDescIdDesc(access.customer(jwt).getId()).stream().map(this::response).toList();
    }
    @Transactional(readOnly=true)
    public ContractDraftResponse get(Jwt jwt,UUID id) {
        var account=access.account(jwt);
        var d=drafts.findByContractId(id).orElseThrow(ContractDraftService::notFound);
        var c=d.getContract();
        if(!c.getApartment().getProperty().getOwner().getId().equals(account.getId()) && !c.getCustomer().getId().equals(account.getId())) throw notFound();
        return response(d);
    }
    @Transactional
    public ContractDraftResponse update(Jwt jwt,UUID id,ContractDraftUpdate input) {
        var owner=access.owner(jwt);
        var requestId=drafts.findRequestId(id).orElseThrow(ContractDraftService::notFound);
        requests.findForOwnerUpdate(requestId,owner.getId()).orElseThrow(ContractDraftService::notFound);
        var d=drafts.findByContractId(id).orElseThrow(ContractDraftService::notFound);
        var c=contracts.lockById(id).orElseThrow(ContractDraftService::notFound);
        if(d.getContentVersion()!=input.getVersion()) throw stale();
        if(c.getStatus()!=RentalContract.Status.DRAFT) throw conflict("CONTRACT_NOT_DRAFT","Chỉ bản nháp mới được chỉnh sửa.");
        validateTerms(input);rights.contract(c.getApartment().getProperty(),input.getStartDate(),input.getEndDate());applyContract(c,input);applyDraft(d,input);
        // Content version is independent of the meter billing chain version.
        d.setContentVersion(d.getContentVersion()+1);
        contracts.saveAndFlush(c);drafts.saveAndFlush(d);
        return response(d);
    }
    private void validateTerms(ContractTerms t) {
        if(!t.getEndDate().isAfter(t.getStartDate())) throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_CONTRACT_DATES","Ngày kết thúc phải sau ngày bắt đầu.");
    }
    private void applyContract(RentalContract c,ContractTerms t) {
        c.setStartDate(t.getStartDate());c.setEndDate(t.getEndDate());c.setMonthlyRent(t.getMonthlyRent());
        c.setElectricityUnitPrice(t.getElectricityUnitPrice());c.setWaterUnitPrice(t.getWaterUnitPrice());
    }
    private void applyDraft(ContractDraft d,ContractTerms t) {
        d.setDeposit(t.getDeposit());d.setPaymentDay(t.getPaymentDay());d.setPaymentMethod(t.getPaymentMethod().strip());
        d.setUsagePurpose(t.getUsagePurpose().strip());d.setClausesJson(json.writeValueAsString(t.getClauses().stream()
            .map(c->new ContractClause(c.title().strip(),c.body().strip())).toList()));
    }
    private ContractSnapshot snapshot(RentalRequest r) {
        var a=r.getApartment();var p=a.getProperty();
        var approved=dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(p.getId()).stream()
            .filter(d->d.getStatus()==PropertyDossier.Status.APPROVED).findFirst().orElse(null);
        return new ContractSnapshot(party(p.getOwner()),party(r.getCustomer()),
            new ContractSnapshot.Asset(a.getId(),p.getId(),p.getName(),a.getTitle(),a.getRoomNumber(),p.getAddress(),p.getCity(),p.getDistrict(),p.getWard(),
                a.getAreaM2().toPlainString(),a.getFloor(),a.getBedrooms(),a.getBathrooms(),List.copyOf(a.getAmenities()),p.getApprovalStatus().name(),
                approved==null?null:approved.getId(),approved==null?null:approved.getRightType().name(),
                approved==null?null:approved.getCertificateNumber(),approved==null?null:approved.getCertificateIssueDate(),
                approved==null?null:approved.getCertificateIssuePlace(),approved==null?null:approved.getExploitationRightDescription(),approved==null?null:approved.isLocalFixture()),
            approved==null?null:new ContractSnapshot.ReceivingAccount(approved.getBank(),approved.getAccountNumber(),approved.getAccountHolderName()));
    }
    private ContractSnapshot.Party party(AuthAccount a) {
        var identity=identities.findById(a.getId()).orElse(null);
        return new ContractSnapshot.Party(a.getId(),identity==null?a.getFullName():identity.getLegalName(),a.getEmail(),a.getPhone(),
            identity==null?a.getAddress():identity.getCurrentAddress(),identity==null?a.getDateOfBirth():identity.getDateOfBirth(),a.isEmailVerified(),
            identity==null?null:identity.getDocumentNumber(),identity==null?null:identity.getIssueDate(),identity==null?null:identity.getIssuePlace(),
            identity==null?null:identity.getPermanentAddress(),identity==null?null:identity.getVerificationStatus().name(),identity==null?null:identity.isLocalFixture());
    }
    private String sourceVersion(RentalRequest r,ContractSnapshot s) {
        String data=json.writeValueAsString(s)+":"+r.getVersion()+":"+r.getApartment().getVersion()+":"+r.getApartment().getProperty().getVersion()
            +":"+r.getCustomer().getVersion()+":"+r.getApartment().getProperty().getOwner().getVersion();
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private ContractDraftResponse response(ContractDraft d) {
        var c=d.getContract();
        return new ContractDraftResponse(c.getId(),d.getRentalRequest().getId(),"HD-"+c.getId(),c.getStatus().name(),d.getContentVersion(),
            c.getStartDate(),c.getEndDate(),c.getMonthlyRent().toPlainString(),c.getElectricityUnitPrice().toPlainString(),c.getWaterUnitPrice().toPlainString(),
            d.getDeposit().toPlainString(),d.getPaymentDay(),d.getPaymentMethod(),d.getUsagePurpose(),
            Arrays.asList(json.readValue(d.getClausesJson(),ContractClause[].class)),json.readValue(d.getSnapshotJson(),ContractSnapshot.class),d.getCreatedAt());
    }
    private static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hợp đồng hoặc yêu cầu thuê."); }
    private static ApiException conflict(String code,String message) { return new ApiException(HttpStatus.CONFLICT,code,message); }
    private static ApiException stale() { return conflict("STALE_VERSION","Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu."); }
}
