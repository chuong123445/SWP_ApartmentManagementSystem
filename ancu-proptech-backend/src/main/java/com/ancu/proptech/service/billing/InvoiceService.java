package com.ancu.proptech.service.billing;
import com.ancu.proptech.dto.billing.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.billing.*;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.repository.billing.*;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.service.apartment.ApartmentService;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeParseException;

@Service @RequiredArgsConstructor
public class InvoiceService {
    private final RentalContractRepository contracts;
    private final com.ancu.proptech.service.contract.ContractExitGuard exitGuard;
    private final RentalInvoiceRepository invoices;
    private final InvoiceNotificationRepository notifications;
    private final AccountAccessService access;
    private final com.ancu.proptech.repository.payment.InvoicePaymentRepository payments;
    private final MeterReadingRepository readings;
    private final com.ancu.proptech.repository.property.PropertySettingsRepository settings;
    private final InvoiceEventRepository events;
    private final tools.jackson.databind.ObjectMapper json;
    private final jakarta.persistence.EntityManager entities;
    private record Source(YearMonth period,BigDecimal electric,BigDecimal water) {}
    @Transactional(readOnly=true) public BillingContext context(Jwt jwt,Long id){
        var owner=access.owner(jwt);var c=contracts.findById(id).orElseThrow(InvoiceService::missing);owned(c,owner.getId());
        return billingContext(c);

    }
    private BillingContext billingContext(RentalContract c){
        var s=source(c);var saved=readings.findByContractIdAndPeriod(c.getId(),s.period().toString()).orElse(null);
        var defaults=settings.findById(c.getApartment().getProperty().getId()).map(p->new BillingTariff(str(p.getElectricityUnitPrice()),str(p.getWaterUnitPrice()),p.getWaterBillingMode().name(),str(p.getInternetFee()),str(p.getGarbageFee()),p.getVersion())).orElse(null);
        return new BillingContext(c.getId(),c.getApartment().getId(),c.getApartment().getRoomNumber(),c.getCustomer().getFullName(),s.period().toString(),str(c.getMonthlyRent()),str(s.electric()),str(saved==null?c.getElectricityUnitPrice():saved.getElectricityUnitPrice()),str(s.water()),str(saved==null?c.getWaterUnitPrice():saved.getWaterUnitPrice()),c.getBillingVersion(),(saved==null?c.getWaterBillingMode():saved.getWaterBillingMode()).name(),c.getOccupantCount(),str(saved==null?c.getInternetFee():saved.getInternetFee()),str(saved==null?c.getGarbageFee():saved.getGarbageFee()),saved==null?null:new SavedMeterReading(str(saved.getElectricityEndReading()),str(saved.getWaterEndReading()),saved.isPropertyRates(),saved.getSavedAt()),defaults,new BillingTariff(str(c.getElectricityUnitPrice()),str(c.getWaterUnitPrice()),c.getWaterBillingMode().name(),str(c.getInternetFee()),str(c.getGarbageFee()),0),estimate(c,s,saved));
    }
    private InvoiceEstimate estimate(RentalContract c,Source source,MeterReading meter){
        if(meter==null)return null;
        var i=new RentalInvoice();i.setMonthlyRent(BigDecimal.ZERO);
        i.setElectricityStartReading(source.electric());i.setElectricityEndReading(meter.getElectricityEndReading());i.setElectricityUnitPrice(meter.getElectricityUnitPrice());
        i.setWaterStartReading(source.water());i.setWaterEndReading(meter.getWaterEndReading());i.setWaterUnitPrice(meter.getWaterUnitPrice());i.setWaterBillingMode(meter.getWaterBillingMode());i.setOccupantCount(meter.getOccupantCount());i.setInternetFee(meter.getInternetFee());i.setGarbageFee(meter.getGarbageFee());
        calculateAmounts(i);
        return new InvoiceEstimate(str(i.getElectricityQuantity()),str(i.getElectricityAmount()),str(i.getWaterQuantity()),str(i.getWaterAmount()),str(i.getTotalAmount()));
    }
    private static void calculateAmounts(RentalInvoice i){
        i.setElectricityQuantity(i.getElectricityEndReading().subtract(i.getElectricityStartReading()));
        i.setElectricityAmount(i.getElectricityQuantity().multiply(i.getElectricityUnitPrice()));

        if(i.getWaterBillingMode()==com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.PER_PERSON){i.setWaterEndReading(i.getWaterStartReading());i.setWaterQuantity(BigDecimal.valueOf(i.getOccupantCount()));}
        else i.setWaterQuantity(i.getWaterEndReading().subtract(i.getWaterStartReading()));
        i.setWaterAmount(i.getWaterQuantity().multiply(i.getWaterUnitPrice()));
        i.setTotalAmount(i.getMonthlyRent().add(i.getElectricityAmount()).add(i.getWaterAmount()).add(i.getInternetFee()).add(i.getGarbageFee()));
    }
    @Transactional public BillingContext saveReadings(Jwt jwt,Long id,MeterReadingSave input){
        var owner=access.owner(jwt);var c=contracts.lockById(id).orElseThrow(InvoiceService::missing);owned(c,owner.getId());
        var s=source(c);
        if(input.getBaselineVersion()!=c.getBillingVersion())throw conflict("VERSION_CONFLICT","Chỉ số đã thay đổi. Hãy tải lại trước khi chốt.");
        if(!s.period().toString().equals(input.getPeriod()))throw conflict("BILLING_SEQUENCE_CONFLICT","Chỉ chốt cho kỳ kế tiếp: "+s.period());
        var r=readings.findByContractIdAndPeriod(id,input.getPeriod()).orElseGet(MeterReading::new);
        if(input.isKeepSavedTariff()&&r.getId()==null)throw conflict("METER_READING_MISSING","Chưa có đơn giá đã chốt để giữ lại.");
        r.setContract(c);r.setPeriod(input.getPeriod());
        if(!input.isKeepSavedTariff()){r.setElectricityUnitPrice(c.getElectricityUnitPrice());r.setWaterUnitPrice(c.getWaterUnitPrice());r.setWaterBillingMode(c.getWaterBillingMode());r.setInternetFee(c.getInternetFee());r.setGarbageFee(c.getGarbageFee());r.setOccupantCount(c.getOccupantCount());}
        if(input.isApplyPropertyRates()&&!input.isKeepSavedTariff()){
            var p=settings.findById(c.getApartment().getProperty().getId()).orElseThrow(()->conflict("PROPERTY_SETTINGS_MISSING","Tài sản chưa được cài đặt đơn giá."));
            if(input.getSettingsVersion()==null||input.getSettingsVersion()!=p.getVersion())throw conflict("SETTINGS_VERSION_CONFLICT","Đơn giá cài đặt đã thay đổi. Hãy tải lại.");
            r.setElectricityUnitPrice(p.getElectricityUnitPrice());r.setWaterUnitPrice(p.getWaterUnitPrice());r.setWaterBillingMode(p.getWaterBillingMode());r.setInternetFee(p.getInternetFee());r.setGarbageFee(p.getGarbageFee());
        }
        if(input.getElectricityEndReading().compareTo(s.electric())<0||(r.getWaterBillingMode()==com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.METERED&&input.getWaterEndReading().compareTo(s.water())<0))throw bad("INVALID_METER_READING","Chỉ số mới không được nhỏ hơn chỉ số đầu kỳ.");
        r.setElectricityEndReading(input.getElectricityEndReading());r.setWaterEndReading(r.getWaterBillingMode()==com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.PER_PERSON?s.water():input.getWaterEndReading());if(!input.isKeepSavedTariff())r.setPropertyRates(input.isApplyPropertyRates());r.setSavedAt(Instant.now());r.setSavedBy(owner.getId());
        readings.saveAndFlush(r);c.setBillingVersion(c.getBillingVersion()+1);contracts.flush();return billingContext(c);
    }
    @Transactional public InvoiceResponse create(Jwt jwt,Long contractId,InvoiceCreate input){
        var owner=access.owner(jwt);var c=contracts.lockById(contractId).orElseThrow(InvoiceService::missing);owned(c,owner.getId());
        if(invoices.existsByContractIdAndPeriodAndKindNotAndStatusNot(c.getId(),input.getPeriod(),RentalInvoice.Kind.RENT,RentalInvoice.Status.CANCELLED))throw conflict("DUPLICATE_BILLING_PERIOD","Đã có hóa đơn cho kỳ này.");
        if(input.getBaselineVersion()!=c.getBillingVersion())throw conflict("VERSION_CONFLICT","Chỉ số đầu kỳ đã thay đổi. Hãy tải lại thông tin lập hóa đơn.");
        var s=source(c);YearMonth period;
        try{period=YearMonth.parse(input.getPeriod());}catch(DateTimeParseException e){throw bad("VALIDATION_ERROR","Kỳ hóa đơn không hợp lệ.");}
        if(!period.equals(s.period()))throw conflict("BILLING_SEQUENCE_CONFLICT","Hóa đơn phải theo kỳ kế tiếp: "+s.period());
        var meter=readings.findByContractIdAndPeriod(c.getId(),period.toString()).orElse(null);
        if(input.isUseSavedReadings()&&meter==null)throw conflict("METER_READING_MISSING","Chưa chốt chỉ số cho kỳ này tại mục Chỉ số Điện Nước.");
        if(meter!=null){
            if((input.getElectricityEndReading()!=null&&input.getElectricityEndReading().compareTo(meter.getElectricityEndReading())!=0)||(input.getWaterEndReading()!=null&&input.getWaterEndReading().compareTo(meter.getWaterEndReading())!=0))throw conflict("SAVED_READING_MISMATCH","Chỉ số đã chốt khác dữ liệu đang mở. Hãy tải lại hóa đơn.");
            input.setElectricityEndReading(meter.getElectricityEndReading());input.setWaterEndReading(meter.getWaterEndReading());
        }
        if(input.getElectricityEndReading()==null||input.getWaterEndReading()==null)throw bad("VALIDATION_ERROR","Cần chỉ số cuối kỳ hoặc sử dụng chỉ số đã chốt.");
        var waterMode=meter==null?c.getWaterBillingMode():meter.getWaterBillingMode();
        if(input.getDueDate().isBefore(period.atDay(1)))throw bad("VALIDATION_ERROR","Hạn đóng không được trước kỳ hóa đơn.");
        if(input.getElectricityEndReading().compareTo(s.electric())<0||(waterMode==com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.METERED && input.getWaterEndReading().compareTo(s.water())<0))throw bad("INVALID_METER_READING","Chỉ số cuối không được nhỏ hơn chỉ số đầu.");
        RentalInvoice i=new RentalInvoice();i.setContract(c);i.setKind(RentalInvoice.Kind.UTILITY);i.setRentMonths(0);i.setCoverageStart(period.atDay(1));i.setCoverageEnd(period.atEndOfMonth());i.setPeriod(period.toString());i.setDueDate(input.getDueDate());i.setMonthlyRent(BigDecimal.ZERO);
        i.setElectricityStartReading(s.electric());i.setElectricityEndReading(input.getElectricityEndReading());i.setElectricityUnitPrice(meter==null?c.getElectricityUnitPrice():meter.getElectricityUnitPrice());
        i.setWaterStartReading(s.water());i.setWaterEndReading(input.getWaterEndReading());i.setWaterUnitPrice(meter==null?c.getWaterUnitPrice():meter.getWaterUnitPrice());
        i.setWaterBillingMode(waterMode);i.setOccupantCount(meter==null?c.getOccupantCount():meter.getOccupantCount());i.setInternetFee(meter==null?c.getInternetFee():meter.getInternetFee());i.setGarbageFee(meter==null?c.getGarbageFee():meter.getGarbageFee());
        calculateAmounts(i);i.setStatus(RentalInvoice.Status.DRAFT);i.setCreatedAt(Instant.now());
        c.setBillingVersion(c.getBillingVersion()+1);invoices.saveAndFlush(i);
        audit(i,owner.getId(),InvoiceEvent.Action.CREATED,null,null);return response(i);
    }
    @Transactional public InvoiceResponse send(Jwt jwt,Long id,InvoiceSend input){
        var owner=access.owner(jwt);var contractId=invoices.findContractId(id).orElseThrow(InvoiceService::missing);
        var c=contracts.lockById(contractId).orElseThrow(InvoiceService::missing);owned(c,owner.getId());
        entities.refresh(c);
        // Reload after obtaining the chain lock; all billing writes use this lock order.
        var i=invoices.findWithContractById(id).orElseThrow(InvoiceService::missing);
        entities.refresh(i);
        if(i.getStatus()==RentalInvoice.Status.SENT)return response(i);
        requireDraft(i);
        if(input.getVersion()!=i.getVersion())throw conflict("VERSION_CONFLICT","Hóa đơn đã thay đổi. Hãy tải lại.");
        if(c.getStatus()!=RentalContract.Status.ACTIVE)throw conflict("INVALID_STATE","Hợp đồng hiện không còn hoạt động.");
        expectedSource(i);
        return sendLocked(i,owner.getId(),false);
    }
    private InvoiceResponse sendLocked(RentalInvoice i,Long ownerId,boolean automatic){
        var c=i.getContract();
        var before=response(i);i.setStatus(RentalInvoice.Status.SENT);i.setSentAt(Instant.now());
        var n=new InvoiceNotification();n.setInvoice(i);n.setCustomer(c.getCustomer());n.setCreatedAt(i.getSentAt());notifications.save(n);
        c.setBillingVersion(c.getBillingVersion()+1);invoices.flush();audit(i,ownerId,InvoiceEvent.Action.SENT,automatic?"Tự động gửi theo cài đặt tài sản":null,before);return response(i);
    }
    @Transactional public InvoiceResponse updateDraft(Jwt jwt,Long id,InvoiceDraftChange input){
        var owner=access.owner(jwt);var i=lockedInvoice(id,owner.getId());var c=i.getContract();
        requireDraft(i);versions(i,input);
        expectedSource(i);
        if(i.getKind()==RentalInvoice.Kind.RENT){
            if(input.getDueDate().isBefore(i.getCoverageStart().withDayOfMonth(c.getRentPaymentDay())))throw bad("VALIDATION_ERROR","Hạn đóng không được trước ngày thanh toán đã thỏa thuận.");
            var before=response(i);i.setDueDate(input.getDueDate());c.setBillingVersion(c.getBillingVersion()+1);
            invoices.flush();audit(i,owner.getId(),InvoiceEvent.Action.UPDATED,input.getReason().strip(),before);return response(i);
        }
        if(input.getElectricityEndReading()==null)throw bad("VALIDATION_ERROR","Cần nhập chỉ số điện cuối kỳ.");
        boolean perPerson=i.getWaterBillingMode()==com.ancu.proptech.model.property.PropertySettings.WaterBillingMode.PER_PERSON;
        if(input.getDueDate().isBefore(YearMonth.parse(i.getPeriod()).atDay(1)))throw bad("VALIDATION_ERROR","Hạn đóng không được trước kỳ hóa đơn.");
        if(!perPerson&&input.getWaterEndReading()==null)throw bad("VALIDATION_ERROR","Cần nhập chỉ số nước cuối kỳ.");
        if(input.getElectricityEndReading().compareTo(i.getElectricityStartReading())<0||(!perPerson&&input.getWaterEndReading().compareTo(i.getWaterStartReading())<0))
            throw bad("INVALID_METER_READING","Chỉ số cuối không được nhỏ hơn chỉ số đầu.");
        var before=response(i);i.setDueDate(input.getDueDate());i.setElectricityEndReading(input.getElectricityEndReading());
        i.setElectricityQuantity(i.getElectricityEndReading().subtract(i.getElectricityStartReading()));i.setElectricityAmount(i.getElectricityQuantity().multiply(i.getElectricityUnitPrice()));
        i.setWaterEndReading(perPerson?i.getWaterStartReading():input.getWaterEndReading());
        i.setWaterQuantity(perPerson?BigDecimal.valueOf(i.getOccupantCount()):i.getWaterEndReading().subtract(i.getWaterStartReading()));i.setWaterAmount(i.getWaterQuantity().multiply(i.getWaterUnitPrice()));
        i.setTotalAmount(i.getMonthlyRent().add(i.getElectricityAmount()).add(i.getWaterAmount()).add(i.getInternetFee()).add(i.getGarbageFee()));
        var r=readings.findByContractIdAndPeriod(c.getId(),i.getPeriod()).orElseGet(MeterReading::new);
        r.setContract(c);r.setPeriod(i.getPeriod());r.setElectricityEndReading(i.getElectricityEndReading());r.setWaterEndReading(i.getWaterEndReading());
        r.setElectricityUnitPrice(i.getElectricityUnitPrice());r.setWaterUnitPrice(i.getWaterUnitPrice());r.setWaterBillingMode(i.getWaterBillingMode());r.setOccupantCount(i.getOccupantCount());r.setInternetFee(i.getInternetFee());r.setGarbageFee(i.getGarbageFee());r.setSavedAt(Instant.now());r.setSavedBy(owner.getId());readings.save(r);
        c.setBillingVersion(c.getBillingVersion()+1);invoices.flush();audit(i,owner.getId(),InvoiceEvent.Action.UPDATED,input.getReason().strip(),before);return response(i);
    }
    @Transactional public InvoiceResponse cancel(Jwt jwt,Long id,InvoiceCancel input){
        var owner=access.owner(jwt);var i=lockedInvoice(id,owner.getId());
        String reason=input.getReason().strip();
        if(i.getStatus()==RentalInvoice.Status.CANCELLED){
            var event=events.findFirstByInvoiceIdAndActionOrderByIdDesc(id,InvoiceEvent.Action.CANCELLED).orElse(null);
            if(event!=null&&event.getActorId().equals(owner.getId())&&reason.equals(event.getReason()))return response(i);
        }
        requireDraft(i);versions(i,input);var before=response(i);
        i.setStatus(RentalInvoice.Status.CANCELLED);var c=i.getContract();c.setBillingVersion(c.getBillingVersion()+1);
        invoices.flush();audit(i,owner.getId(),InvoiceEvent.Action.CANCELLED,reason,before);return response(i);
    }
    @Transactional(readOnly=true) public java.util.List<InvoiceHistoryResponse> history(Jwt jwt,Long id){
        var owner=access.owner(jwt);var i=invoices.findWithContractById(id).orElseThrow(InvoiceService::missing);owned(i.getContract(),owner.getId());
        return events.findByInvoiceIdOrderByIdAsc(id).stream().map(e->new InvoiceHistoryResponse(e.getId(),e.getActorId(),e.getAction().name(),e.getOccurredAt(),e.getReason(),e.getBeforeJson()==null?null:json.readValue(e.getBeforeJson(),InvoiceResponse.class),json.readValue(e.getAfterJson(),InvoiceResponse.class))).toList();
    }
    private RentalInvoice lockedInvoice(Long id,Long ownerId){
        var contractId=invoices.findContractId(id).orElseThrow(InvoiceService::missing);
        var c=contracts.lockById(contractId).orElseThrow(InvoiceService::missing);entities.refresh(c);owned(c,ownerId);
        var i=invoices.findWithContractById(id).orElseThrow(InvoiceService::missing);entities.refresh(i);return i;
    }
    private void versions(RentalInvoice i,InvoiceCancel input){
        if(input.getVersion()!=i.getVersion()||input.getBillingVersion()!=i.getContract().getBillingVersion())throw conflict("VERSION_CONFLICT","Hóa đơn hoặc chuỗi chỉ số đã thay đổi. Hãy tải lại trước khi tiếp tục.");
        boolean laterRent=i.getKind()==RentalInvoice.Kind.RENT&&invoices.findByContractIdAndStatusNotOrderByPeriodAsc(i.getContract().getId(),RentalInvoice.Status.CANCELLED).stream().anyMatch(other->other.getKind()!=RentalInvoice.Kind.UTILITY&&other.getPeriod().compareTo(i.getPeriod())>0);
        if(laterRent||(i.getKind()!=RentalInvoice.Kind.RENT&&invoices.existsByContractIdAndPeriodGreaterThanAndKindNotAndStatusNot(i.getContract().getId(),i.getPeriod(),RentalInvoice.Kind.RENT,RentalInvoice.Status.CANCELLED)))throw conflict("BILLING_SEQUENCE_CONFLICT","Đã có hóa đơn kỳ sau. Cần kiểm tra lại chuỗi chỉ số.");
    }
    private static void requireDraft(RentalInvoice i){if(i.getStatus()!=RentalInvoice.Status.DRAFT)throw conflict("INVALID_STATE","Chỉ được sửa, hủy hoặc gửi hóa đơn nháp.");}
    private void expectedSource(RentalInvoice i){
        if(i.getKind()==RentalInvoice.Kind.RENT){
            if(i.getCoverageStart().isBefore(i.getContract().getStartDate())||i.getCoverageEnd().isAfter(i.getContract().getEndDate()))throw conflict("BILLING_PERIOD_OUT_OF_RANGE","Kỳ tiền thuê vượt thời hạn hợp đồng.");
            boolean overlap=invoices.findByContractIdAndStatusNotOrderByPeriodAsc(i.getContract().getId(),RentalInvoice.Status.CANCELLED).stream()
                .filter(other->!other.getId().equals(i.getId())&&other.getKind()!=RentalInvoice.Kind.UTILITY)
                .anyMatch(other->!end(other).isBefore(i.getCoverageStart())&&!start(other).isAfter(i.getCoverageEnd()));
            if(overlap)throw conflict("DUPLICATE_BILLING_PERIOD","Kỳ tiền thuê trùng hóa đơn đã lập.");
            return;
        }
        var s=sourceAfterSent(i.getContract());
        if(!i.getPeriod().equals(s.period().toString())||i.getElectricityStartReading().compareTo(s.electric())!=0||i.getWaterStartReading().compareTo(s.water())!=0
            ||invoices.existsByContractIdAndPeriodGreaterThanAndKindNotAndStatusNot(i.getContract().getId(),i.getPeriod(),RentalInvoice.Kind.RENT,RentalInvoice.Status.CANCELLED))
            throw conflict("BILLING_SEQUENCE_CONFLICT","Mốc chỉ số đã thay đổi. Hãy tải lại và kiểm tra chuỗi hóa đơn.");
    }
    private void audit(RentalInvoice i,Long actorId,InvoiceEvent.Action action,String reason,InvoiceResponse before){
        var e=new InvoiceEvent();e.setInvoiceId(i.getId());e.setActorId(actorId);e.setAction(action);e.setReason(reason);e.setOccurredAt(Instant.now());e.setBeforeJson(before==null?null:json.writeValueAsString(before));e.setAfterJson(json.writeValueAsString(response(i)));events.save(e);
    }
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> owner(Jwt jwt,int page,int size){return owner(jwt,page,size,null);}
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> owner(Jwt jwt,int page,int size,Long propertyId){
        return owner(jwt,page,size,propertyId,OwnerInvoiceFilter.ALL);
    }
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> owner(Jwt jwt,int page,int size,Long propertyId,OwnerInvoiceFilter filter){
        ApartmentService.validatePage(page,size);var ownerId=access.owner(jwt).getId();
        Boolean paid=filter==OwnerInvoiceFilter.PAID?Boolean.TRUE:filter==OwnerInvoiceFilter.UNPAID?Boolean.FALSE:null;
        var result=invoices.ownerHistory(ownerId,propertyId,filter==OwnerInvoiceFilter.DRAFT?RentalInvoice.Status.DRAFT:filter==OwnerInvoiceFilter.CANCELLED?RentalInvoice.Status.CANCELLED:null,paid,paging(page,size));
        return PageResponse.from(result.map(this::response));
    }
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> mine(Jwt jwt,int page,int size){return mine(jwt,page,size,InvoicePaymentFilter.ALL);}
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> mine(Jwt jwt,int page,int size,InvoicePaymentFilter paymentStatus){
        ApartmentService.validatePage(page,size);var customerId=access.customer(jwt).getId();
        var result=paymentStatus==InvoicePaymentFilter.ALL
            ? invoices.findByContractCustomerIdAndStatus(customerId,RentalInvoice.Status.SENT,paging(page,size))
            : invoices.findByCustomerAndPaymentStatus(customerId,RentalInvoice.Status.SENT,paymentStatus==InvoicePaymentFilter.PAID,paging(page,size));
        return PageResponse.from(result.map(this::response));
    }
    @Transactional(readOnly=true) public InvoiceResponse detail(Jwt jwt,Long id){
        var u=access.account(jwt);var i=invoices.findWithContractById(id).orElseThrow(InvoiceService::missing);var c=i.getContract();
        if(c.getApartment().getProperty().getOwner().getId().equals(u.getId())){access.owner(jwt);return response(i);}
        if(c.getCustomer().getId().equals(u.getId())&&i.getStatus()==RentalInvoice.Status.SENT){access.customer(jwt);return response(i);}throw missing();
    }
    private Source source(RentalContract c){
        if(c.getStatus()!=RentalContract.Status.ACTIVE)throw conflict("INVALID_STATE","Chỉ lập hóa đơn cho hợp đồng đang hoạt động.");
        // Meter readings advance through their own monthly invoice chain.
        if(invoices.existsByContractIdAndKindNotAndStatus(c.getId(),RentalInvoice.Kind.RENT,RentalInvoice.Status.DRAFT))throw conflict("BILLING_SEQUENCE_CONFLICT","Cần gửi hóa đơn nháp hiện tại trước khi lập kỳ tiếp theo.");
        return sourceAfterSent(c);
    }
    private Source sourceAfterSent(RentalContract c){
        if(c.getStatus()!=RentalContract.Status.ACTIVE)throw conflict("INVALID_STATE","Hợp đồng hiện không còn hoạt động.");
        var last=invoices.findFirstByContractIdAndKindNotAndStatusOrderByPeriodDesc(c.getId(),RentalInvoice.Kind.RENT,RentalInvoice.Status.SENT);
        var period=last.map(i->YearMonth.parse(i.getPeriod()).plusMonths(1)).orElse(YearMonth.from(c.getStartDate()));
        if(period.atEndOfMonth().isAfter(c.getEndDate()))throw conflict("BILLING_PERIOD_OUT_OF_RANGE","Không có kỳ trọn tháng tiếp theo trong hợp đồng.");
        return new Source(period,last.map(RentalInvoice::getElectricityEndReading).orElse(c.getElectricityBaseline()==null?BigDecimal.ZERO:c.getElectricityBaseline()),
            last.map(RentalInvoice::getWaterEndReading).orElse(c.getWaterBaseline()==null?BigDecimal.ZERO:c.getWaterBaseline()));
    }
    @Transactional(readOnly=true)
    public RentBillingContext rentContext(Jwt jwt,Long id){
        var owner=access.owner(jwt);var c=contracts.findById(id).orElseThrow(InvoiceService::missing);owned(c,owner.getId());
        return rentContext(c);
    }
    private RentBillingContext rentContext(RentalContract c){
        if(c.getStatus()!=RentalContract.Status.ACTIVE)throw conflict("INVALID_STATE","Chỉ lập tiền thuê cho hợp đồng đang hoạt động.");
        var history=invoices.findByContractIdAndStatusNotOrderByPeriodAsc(c.getId(),RentalInvoice.Status.CANCELLED);
        var draft=history.stream().filter(i->i.getKind()!=RentalInvoice.Kind.UTILITY&&i.getStatus()==RentalInvoice.Status.DRAFT).findFirst().orElse(null);
        var next=draft==null?RentSchedule.next(c,history):new RentSchedule.Period(start(draft),end(draft),draft.getRentMonths());
        LocalDate due=next==null?null:next.start().withDayOfMonth(c.getRentPaymentDay());
        if(draft!=null)due=draft.getDueDate();
        String mode=settings.findById(c.getApartment().getProperty().getId()).map(p->p.getRentInvoiceMode().name()).orElse("DRAFT");
        return new RentBillingContext(c.getId().toString(),c.getRentCycleMonths(),next==null?null:next.start(),next==null?null:next.end(),next==null?0:next.months(),
            str(c.getMonthlyRent()),next==null?"0":str(c.getMonthlyRent().multiply(BigDecimal.valueOf(next.months()))),due,
            c.getBillingVersion(),draft==null?null:draft.getId().toString(),RentSchedule.partial(c),mode);
    }
    @Transactional
    public InvoiceResponse createRent(Jwt jwt,Long id,RentInvoiceCreate input){
        var owner=access.owner(jwt);var c=contracts.lockById(id).orElseThrow(InvoiceService::missing);entities.refresh(c);owned(c,owner.getId());
        var context=rentContext(c);
        if(input.billingVersion()!=c.getBillingVersion()||!java.util.Objects.equals(input.coverageStart(),context.coverageStart()))throw conflict("VERSION_CONFLICT","Kỳ tiền thuê đã thay đổi. Hãy tải lại.");
        if(context.existingDraftId()!=null)throw conflict("OPEN_RENT_DRAFT","Cần gửi hoặc hủy hóa đơn tiền thuê nháp hiện tại.");
        return response(createRentLocked(c,context,input.dueDate(),false));
    }
    private RentalInvoice createRentLocked(RentalContract c,RentBillingContext context,LocalDate due,boolean automated){
        if(context.coverageStart()==null)throw conflict("BILLING_PERIOD_OUT_OF_RANGE","Đã hết tháng tròn cần thu tiền thuê. Phần ngày lẻ xử lý riêng.");
        if(due.isBefore(context.dueDate()))throw bad("VALIDATION_ERROR","Hạn đóng không được trước ngày thanh toán đã thỏa thuận.");
        var i=new RentalInvoice();i.setContract(c);i.setKind(RentalInvoice.Kind.RENT);i.setAutoGenerated(automated);
        i.setPeriod(YearMonth.from(context.coverageStart()).toString());i.setCoverageStart(context.coverageStart());i.setCoverageEnd(context.coverageEnd());
        i.setRentMonths(context.months());i.setRentUnitPrice(c.getMonthlyRent());i.setMonthlyRent(c.getMonthlyRent().multiply(BigDecimal.valueOf(context.months())));
        i.setDueDate(due);i.setStatus(RentalInvoice.Status.DRAFT);i.setCreatedAt(Instant.now());
        i.setElectricityStartReading(BigDecimal.ZERO);i.setElectricityEndReading(BigDecimal.ZERO);i.setElectricityQuantity(BigDecimal.ZERO);i.setElectricityUnitPrice(BigDecimal.ZERO);i.setElectricityAmount(BigDecimal.ZERO);
        i.setWaterStartReading(BigDecimal.ZERO);i.setWaterEndReading(BigDecimal.ZERO);i.setWaterQuantity(BigDecimal.ZERO);i.setWaterUnitPrice(BigDecimal.ZERO);i.setWaterAmount(BigDecimal.ZERO);
        i.setInternetFee(BigDecimal.ZERO);i.setGarbageFee(BigDecimal.ZERO);i.setTotalAmount(i.getMonthlyRent());
        c.setBillingVersion(c.getBillingVersion()+1);invoices.saveAndFlush(i);audit(i,c.getApartment().getProperty().getOwner().getId(),InvoiceEvent.Action.CREATED,automated?"Tự động lập tiền thuê theo chu kỳ hợp đồng":null,null);
        return i;
    }
    @Transactional(readOnly=true)
    public java.util.List<Long> scheduledRentContracts(){return contracts.findActiveBillingIds();}
    @Transactional
    public void prepareScheduledRent(Long id){
        var c=contracts.lockById(id).orElseThrow(InvoiceService::missing);entities.refresh(c);
        if(c.getStatus()!=RentalContract.Status.ACTIVE||exitGuard.blocks(id)||c.getApartment().getProperty().getOwner().getStatus()!=com.ancu.proptech.model.auth.AuthAccount.Status.ACTIVE)return;
        var context=rentContext(c);var today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        if(context.coverageStart()==null||context.automationMode().equals("MANUAL")||today.isBefore(context.dueDate().minusDays(7))||today.isAfter(context.dueDate()))return;
        RentalInvoice invoice;
        if(context.existingDraftId()!=null){invoice=invoices.findById(Long.valueOf(context.existingDraftId())).orElseThrow(InvoiceService::missing);if(!invoice.isAutoGenerated())return;}
        else invoice=createRentLocked(c,context,context.dueDate(),true);
        if(context.automationMode().equals("SEND")){expectedSource(invoice);sendLocked(invoice,c.getApartment().getProperty().getOwner().getId(),true);}
    }
    private static LocalDate start(RentalInvoice i){return i.getCoverageStart()==null?YearMonth.parse(i.getPeriod()).atDay(1):i.getCoverageStart();}
    private static LocalDate end(RentalInvoice i){return i.getCoverageEnd()==null?YearMonth.parse(i.getPeriod()).atEndOfMonth():i.getCoverageEnd();}
    private static Pageable paging(int p,int s){return PageRequest.of(p,s,Sort.by(Sort.Direction.DESC,"createdAt","id"));}
    private static void owned(RentalContract c,Long owner){if(!c.getApartment().getProperty().getOwner().getId().equals(owner))throw missing();}
    private static String str(BigDecimal x){return x.toPlainString();}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hóa đơn hoặc hợp đồng thuộc tài khoản của bạn.");}
    private static ApiException conflict(String code,String message){return new ApiException(HttpStatus.CONFLICT,code,message);}
    private static ApiException bad(String code,String message){return new ApiException(HttpStatus.BAD_REQUEST,code,message);}
    private InvoiceResponse response(RentalInvoice i){var c=i.getContract();var a=c.getApartment();var payment=payments.findByInvoiceId(i.getId()).orElse(null);return new InvoiceResponse(i.getId(),c.getId(),a.getId(),c.getCustomer().getId(),a.getRoomNumber(),a.getTitle(),c.getCustomer().getFullName(),i.getPeriod(),i.getDueDate(),str(i.getMonthlyRent()),str(i.getElectricityStartReading()),str(i.getElectricityEndReading()),str(i.getElectricityQuantity()),str(i.getElectricityUnitPrice()),str(i.getElectricityAmount()),str(i.getWaterStartReading()),str(i.getWaterEndReading()),str(i.getWaterQuantity()),str(i.getWaterUnitPrice()),str(i.getWaterAmount()),str(i.getTotalAmount()),i.getStatus().name(),i.getCreatedAt(),i.getSentAt(),i.getVersion(),payment!=null&&payment.getPaidAt()!=null?"PAID":"UNPAID",payment==null?null:payment.getPaidAt(),i.getWaterBillingMode().name(),i.getOccupantCount(),str(i.getInternetFee()),str(i.getGarbageFee()),c.getBillingVersion(),i.getKind().name(),i.getCoverageStart(),i.getCoverageEnd(),i.getRentMonths(),str(i.getKind()==RentalInvoice.Kind.LEGACY?i.getMonthlyRent():i.getRentUnitPrice()));}
}
