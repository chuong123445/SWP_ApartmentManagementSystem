package com.ancu.proptech.service.contract;

import com.ancu.proptech.dto.contract.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.model.contract.*;
import com.ancu.proptech.model.rental.RentalRequest;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.repository.contract.*;
import com.ancu.proptech.repository.rental.RentalRequestRepository;
import com.ancu.proptech.service.auth.*;
import com.ancu.proptech.service.property.PropertyRightsPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class ContractLifecycleService {
    private final ContractDraftRepository drafts;
    private final RentalContractRepository contracts;
    private final ContractHandoverRepository handovers;
    private final RentalRequestRepository requests;
    private final ApartmentRepository apartments;
    private final RentalInvoiceRepository invoices;
    private final AccountAccessService access;
    private final AccountVerificationPolicy verification;
    private final PropertyRightsPolicy rights;
    private final ContractDraftService authoring;
    private final ObjectMapper json;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entities;

    @Transactional
    public ContractContextResponse renewalContext(Jwt jwt,Long id) {
        var d=lock(jwt,id,true);var c=d.getContract();renewable(c);
        var snapshot=authoring.snapshot(d.getRentalRequest());
        var next=openRenewal(id);
        return new ContractContextResponse(d.getRentalRequest().getId(),c.getVersion(),authoring.sourceVersion(d.getRentalRequest(),snapshot),snapshot,
            c.getMonthlyRent().toPlainString(),d.getDeposit().toPlainString(),
            Arrays.asList(json.readValue(d.getClausesJson(),ContractClause[].class)),
            next==null?null:authoring.response(drafts.findByContractId(next.getId()).orElseThrow(ContractLifecycleService::missing)),
            c.getApartment().getProperty().getRightsValidFrom(),c.getApartment().getProperty().getRightsValidUntil());
    }

    @Transactional
    public ContractDraftResponse renew(Jwt jwt,Long id,ContractDraftCreate input) {
        var d=lock(jwt,id,true);var c=d.getContract();renewable(c);
        if(c.getVersion()!=input.getRequestVersion()) throw stale();
        if(openRenewal(id)!=null)throw conflict("OPEN_RENEWAL","Đã có bản ký tiếp. Hãy mở bản đó hoặc hủy trước khi tạo lại.");
        var snapshot=authoring.snapshot(d.getRentalRequest());
        if(!authoring.sourceVersion(d.getRentalRequest(),snapshot).equals(input.getSourceVersion()))throw stale();
        authoring.validateTerms(input);
        if(!input.getStartDate().isAfter(c.getEndDate()))throw conflict("RENEWAL_OVERLAP","Kỳ mới phải bắt đầu sau ngày kết thúc hợp đồng cũ.");
        if(input.getEndDate().isBefore(rights.today()))throw conflict("RENEWAL_EXPIRED","Thời hạn ký tiếp không được đã hết hạn.");
        rights.requireCurrent(c.getApartment().getProperty());rights.contract(c.getApartment().getProperty(),input.getStartDate(),input.getEndDate());
        var customer=c.getCustomer();
        if(customer.getStatus()!=AuthAccount.Status.ACTIVE || !verification.isRentalVerified(customer))throw conflict("CUSTOMER_NOT_ELIGIBLE","Khách thuê không còn đủ điều kiện.");
        var a=apartments.findForRequest(c.getApartment().getId()).orElseThrow(ContractLifecycleService::missing);
        if(a.getAvailability()!=Apartment.Availability.OCCUPIED)throw conflict("INVALID_STATE","Phòng không còn trong quan hệ thuê hiện tại.");
        var request=new RentalRequest();request.setApartment(a);request.setCustomer(customer);request.setStatus(RentalRequest.Status.ACCEPTED);
        request.setQuotedMonthlyRent(input.getMonthlyRent());request.setMessage("Ký tiếp hợp đồng HD-"+id);request.setCreatedAt(Instant.now());requests.saveAndFlush(request);
        var successor=new RentalContract();successor.setApartment(a);successor.setCustomer(customer);successor.setStatus(RentalContract.Status.DRAFT);
        successor.setRenewalOfContractId(id);authoring.applyContract(successor,input);contracts.saveAndFlush(successor);
        var draft=new ContractDraft();draft.setContract(successor);draft.setRentalRequest(request);draft.setSnapshotJson(json.writeValueAsString(snapshot));
        draft.setCreatedAt(Instant.now());authoring.applyDraft(draft,input);drafts.saveAndFlush(draft);
        return authoring.response(draft);
    }

    @Transactional
    public ContractDraftResponse cancelRenewal(Jwt jwt,Long id,LifecycleConfirm input) {
        var d=lock(jwt,id,true);var c=d.getContract();
        if(c.getVersion()!=input.version())throw stale();
        if(c.getRenewalOfContractId()==null || c.getStatus()!=RentalContract.Status.DRAFT)throw conflict("INVALID_STATE","Chỉ hủy bản ký tiếp chưa đủ hai chữ ký.");
        requireConsent(input.consent());c.setStatus(RentalContract.Status.ENDED);c.setEndReason("RENEWAL_CANCELLED");c.setEndedAt(Instant.now());
        d.getRentalRequest().setStatus(RentalRequest.Status.CANCELLED);contracts.saveAndFlush(c);
        return authoring.response(d);
    }

    @Transactional
    public ContractDraftResponse proposeHandover(Jwt jwt,Long id,HandoverCreate input) {
        var d=lock(jwt,id,true);var c=d.getContract();returnable(c);
        if(c.getVersion()!=input.version())throw stale();requireConsent(input.consent());
        if(handovers.existsByContractIdAndStatus(id,ContractHandover.Status.PENDING))throw conflict("OPEN_HANDOVER","Đã có biên bản bàn giao chờ khách xác nhận.");
        if(openRenewal(id)!=null)throw conflict("OPEN_RENEWAL","Cần hủy bản ký tiếp đang chờ trước khi bàn giao.");
        if(input.returnDate().isBefore(c.getEndDate()) || input.returnDate().isAfter(rights.today()))
            throw conflict("INVALID_RETURN_DATE","Ngày bàn giao phải từ ngày hết hạn đến hôm nay.");
        if(!input.keysReturned())throw conflict("KEYS_NOT_RETURNED","Cần xác nhận chìa khóa và tài sản đã bàn giao.");
        requireNoDraftInvoice(c);
        var settlement=utilityCost(c,input.electricityReading(),input.waterReading(),input.electricityStartReading(),input.waterStartReading());
        var utilities=settlement.cost();var balance=d.getDeposit().subtract(input.deductionAmount()).subtract(utilities);
        if(balance.abs().compareTo(new BigDecimal("9999999999999.99"))>0)throw conflict("SETTLEMENT_TOO_LARGE","Số tiền đối soát vượt giới hạn. Hãy kiểm tra khấu trừ và chỉ số.");
        var h=new ContractHandover();h.setContract(c);h.setStatus(ContractHandover.Status.PENDING);h.setReturnDate(input.returnDate());
        h.setElectricityReading(input.electricityReading());h.setWaterReading(input.waterReading());h.setKeysReturned(true);h.setConditionNotes(input.conditionNotes().strip());
        h.setElectricityStartReading(settlement.electricStart());h.setWaterStartReading(settlement.waterStart());
        h.setDepositAmount(d.getDeposit());h.setDeductionAmount(input.deductionAmount());h.setUtilityAmount(utilities);
        h.setRefundAmount(balance.max(BigDecimal.ZERO));h.setExtraAmountDue(balance.negate().max(BigDecimal.ZERO));h.setOwnerConfirmedAt(Instant.now());
        handovers.saveAndFlush(h);return authoring.response(d);
    }

    @Transactional
    public ContractDraftResponse confirmHandover(Jwt jwt,Long id,LifecycleConfirm input) {
        var d=lock(jwt,id,false);var c=d.getContract();var account=access.account(jwt);
        if(!c.getCustomer().getId().equals(account.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"CUSTOMER_CONFIRMATION_REQUIRED","Chỉ khách thuê của hợp đồng mới xác nhận trả phòng.");
        returnable(c);requireConsent(input.consent());
        var h=pending(id,input.version());requireNoDraftInvoice(c);
        if(openRenewal(id)!=null)throw conflict("OPEN_RENEWAL","Đang có bản ký tiếp chưa xử lý.");
        var current=utilityCost(c,h.getElectricityReading(),h.getWaterReading(),h.getElectricityStartReading(),h.getWaterStartReading());
        if(current.cost().compareTo(h.getUtilityAmount())!=0 || current.electricStart().compareTo(h.getElectricityStartReading())!=0 || current.waterStart().compareTo(h.getWaterStartReading())!=0)
            throw conflict("HANDOVER_SOURCE_CHANGED","Hóa đơn hoặc chỉ số đã thay đổi. Chủ nhà cần lập lại biên bản.");
        var a=apartments.findForRequest(c.getApartment().getId()).orElseThrow(ContractLifecycleService::missing);
        if(a.getAvailability()!=Apartment.Availability.OCCUPIED || contracts.findByApartmentId(a.getId()).stream().anyMatch(other->!other.getId().equals(id)&&other.getStatus()!=RentalContract.Status.ENDED))
            throw conflict("INVALID_STATE","Phòng đang có quan hệ hợp đồng khác. Không thể trả phòng.");
        h.setStatus(ContractHandover.Status.CONFIRMED);h.setCustomerConfirmedAt(Instant.now());
        c.setStatus(RentalContract.Status.ENDED);c.setEndReason("HANDOVER");c.setEndedAt(Instant.now());
        a.setElectricityIndex(h.getElectricityReading().intValueExact());a.setWaterIndex(h.getWaterReading().intValueExact());a.setAvailability(Apartment.Availability.VACANT);
        handovers.saveAndFlush(h);contracts.saveAndFlush(c);apartments.saveAndFlush(a);
        return authoring.response(d);
    }

    @Transactional
    public ContractDraftResponse cancelHandover(Jwt jwt,Long id,LifecycleConfirm input) {
        var d=lock(jwt,id,true);requireConsent(input.consent());
        var h=pending(id,input.version());h.setStatus(ContractHandover.Status.CANCELLED);handovers.saveAndFlush(h);
        return authoring.response(d);
    }
    private ContractDraft lock(Jwt jwt,Long id,boolean ownerOnly) {
        var account=ownerOnly?access.owner(jwt):access.account(jwt);
        var d=drafts.findByContractId(id).orElseThrow(ContractLifecycleService::missing);var c=d.getContract();
        Long owner=c.getApartment().getProperty().getOwner().getId();
        if(!owner.equals(account.getId()) && (ownerOnly || !c.getCustomer().getId().equals(account.getId())))throw missing();
        if(c.getRenewalOfContractId()!=null)requests.findForOwnerUpdate(drafts.findRequestId(c.getRenewalOfContractId()).orElseThrow(ContractLifecycleService::missing),owner).orElseThrow(ContractLifecycleService::missing);
        requests.findForOwnerUpdate(d.getRentalRequest().getId(),owner).orElseThrow(ContractLifecycleService::missing);
        contracts.lockById(id).orElseThrow(ContractLifecycleService::missing);entities.refresh(c);entities.refresh(d);return d;
    }
    private void renewable(RentalContract c) {
        if(c.getStatus()!=RentalContract.Status.ACTIVE || !c.getEndDate().isBefore(rights.today()))throw conflict("NOT_EXPIRED","Chỉ ký tiếp sau khi hợp đồng hiện tại đã hết hạn.");
        if(handovers.existsByContractIdAndStatus(c.getId(),ContractHandover.Status.PENDING))throw conflict("OPEN_HANDOVER","Cần hủy bàn giao đang chờ trước khi ký tiếp.");
    }
    private void returnable(RentalContract c) {
        if(c.getStatus()!=RentalContract.Status.ACTIVE || c.getEndDate().isAfter(rights.today()))throw conflict("NOT_EXPIRED","Bàn giao khi hợp đồng đến ngày kết thúc hoặc đã hết hạn.");
    }
    private RentalContract openRenewal(Long id){return contracts.findByRenewalOfContractIdAndStatusNot(id,RentalContract.Status.ENDED).stream().findFirst().orElse(null);}
    private ContractHandover pending(Long id,long version){var h=handovers.findFirstByContractIdOrderByIdDesc(id).orElseThrow(ContractLifecycleService::missing);entities.refresh(h);
        if(h.getStatus()!=ContractHandover.Status.PENDING)throw conflict("INVALID_STATE","Biên bản không còn chờ xác nhận.");if(h.getVersion()!=version)throw stale();return h;}
    private void requireNoDraftInvoice(RentalContract c){if(invoices.existsByContractIdAndStatus(c.getId(),RentalInvoice.Status.DRAFT))throw conflict("OPEN_INVOICE_DRAFT","Cần xử lý hóa đơn nháp trước khi kết thúc thuê.");}
    private record Settlement(BigDecimal electricStart,BigDecimal waterStart,BigDecimal cost) {}
    private Settlement utilityCost(RentalContract c,BigDecimal electric,BigDecimal water,BigDecimal suppliedElectricStart,BigDecimal suppliedWaterStart) {
        var last=invoices.findFirstByContractIdAndStatusOrderByPeriodDesc(c.getId(),RentalInvoice.Status.SENT);
        var electricStart=last.map(i->i.getElectricityEndReading()).orElse(c.getElectricityBaseline());
        var waterStart=last.map(i->i.getWaterEndReading()).orElse(c.getWaterBaseline());
        if(electricStart==null)electricStart=suppliedElectricStart;
        if(waterStart==null)waterStart=suppliedWaterStart;
        if(electricStart==null || waterStart==null)throw conflict("METER_BASELINE_MISSING","Chưa có chỉ số đầu kỳ. Chủ nhà cần nhập chỉ số đầu đã đối chiếu để khách kiểm tra và xác nhận.");
        if(electric.compareTo(electricStart)<0 || water.compareTo(waterStart)<0)throw conflict("INVALID_METER_READING","Chỉ số bàn giao không được nhỏ hơn chỉ số đã ghi nhận/thanh toán trong hóa đơn.");
        var cost=electric.subtract(electricStart).multiply(c.getElectricityUnitPrice()).add(water.subtract(waterStart).multiply(c.getWaterUnitPrice())).setScale(2,java.math.RoundingMode.HALF_UP);
        if(cost.compareTo(new BigDecimal("9999999999999.99"))>0)throw conflict("SETTLEMENT_TOO_LARGE","Số tiền đối soát vượt giới hạn. Hãy kiểm tra chỉ số.");return new Settlement(electricStart,waterStart,cost);
    }
    private static void requireConsent(boolean consent){if(!consent)throw new ApiException(HttpStatus.BAD_REQUEST,"CONSENT_REQUIRED","Cần xác nhận đồng ý.");}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hợp đồng hoặc biên bản thuộc tài khoản của bạn.");}
    private static ApiException conflict(String code,String message){return new ApiException(HttpStatus.CONFLICT,code,message);}
    private static ApiException stale(){return conflict("STALE_VERSION","Dữ liệu đã thay đổi. Hãy cập nhật trạng thái và thử lại.");}
}
