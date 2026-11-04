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
    private final RentalInvoiceRepository invoices;
    private final InvoiceNotificationRepository notifications;
    private final AccountAccessService access;
    private final com.ancu.proptech.repository.payment.InvoicePaymentRepository payments;
    private final MeterReadingRepository readings;
    private final com.ancu.proptech.repository.property.PropertySettingsRepository settings;
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
        var i=new RentalInvoice();i.setMonthlyRent(c.getMonthlyRent());
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
        if(invoices.existsByContractIdAndPeriod(c.getId(),input.getPeriod()))throw conflict("DUPLICATE_BILLING_PERIOD","Đã có hóa đơn cho kỳ này.");
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
        RentalInvoice i=new RentalInvoice();i.setContract(c);i.setPeriod(period.toString());i.setDueDate(input.getDueDate());i.setMonthlyRent(c.getMonthlyRent());
        i.setElectricityStartReading(s.electric());i.setElectricityEndReading(input.getElectricityEndReading());i.setElectricityUnitPrice(meter==null?c.getElectricityUnitPrice():meter.getElectricityUnitPrice());
        i.setWaterStartReading(s.water());i.setWaterEndReading(input.getWaterEndReading());i.setWaterUnitPrice(meter==null?c.getWaterUnitPrice():meter.getWaterUnitPrice());
        i.setWaterBillingMode(waterMode);i.setOccupantCount(meter==null?c.getOccupantCount():meter.getOccupantCount());i.setInternetFee(meter==null?c.getInternetFee():meter.getInternetFee());i.setGarbageFee(meter==null?c.getGarbageFee():meter.getGarbageFee());
        calculateAmounts(i);i.setStatus(RentalInvoice.Status.DRAFT);i.setCreatedAt(Instant.now());
        c.setBillingVersion(c.getBillingVersion()+1);return response(invoices.saveAndFlush(i));
    }
    @Transactional public InvoiceResponse send(Jwt jwt,Long id,InvoiceSend input){
        var owner=access.owner(jwt);var contractId=invoices.findContractId(id).orElseThrow(InvoiceService::missing);
        var c=contracts.lockById(contractId).orElseThrow(InvoiceService::missing);owned(c,owner.getId());
        // Reload after obtaining the chain lock; all billing writes use this lock order.
        var i=invoices.findWithContractById(id).orElseThrow(InvoiceService::missing);
        if(i.getStatus()==RentalInvoice.Status.SENT)return response(i);
        if(input.getVersion()!=i.getVersion())throw conflict("VERSION_CONFLICT","Hóa đơn đã thay đổi. Hãy tải lại.");
        if(c.getStatus()!=RentalContract.Status.ACTIVE)throw conflict("INVALID_STATE","Hợp đồng hiện không còn hoạt động.");
        i.setStatus(RentalInvoice.Status.SENT);i.setSentAt(Instant.now());
        var n=new InvoiceNotification();n.setInvoice(i);n.setCustomer(c.getCustomer());n.setCreatedAt(i.getSentAt());notifications.save(n);
        c.setBillingVersion(c.getBillingVersion()+1);invoices.flush();return response(i);
    }
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> owner(Jwt jwt,int page,int size){return owner(jwt,page,size,null);}
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> owner(Jwt jwt,int page,int size,Long propertyId){
        return owner(jwt,page,size,propertyId,OwnerInvoiceFilter.ALL);
    }
    @Transactional(readOnly=true) public PageResponse<InvoiceResponse> owner(Jwt jwt,int page,int size,Long propertyId,OwnerInvoiceFilter filter){
        ApartmentService.validatePage(page,size);var ownerId=access.owner(jwt).getId();
        Boolean paid=filter==OwnerInvoiceFilter.PAID?Boolean.TRUE:filter==OwnerInvoiceFilter.UNPAID?Boolean.FALSE:null;
        var result=invoices.ownerHistory(ownerId,propertyId,filter==OwnerInvoiceFilter.DRAFT?RentalInvoice.Status.DRAFT:null,paid,paging(page,size));
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
        if(c.getElectricityBaseline()==null||c.getWaterBaseline()==null||c.getBaselineDate()==null||!c.getBaselineDate().equals(c.getStartDate()))throw conflict("METER_BASELINE_MISSING","Hợp đồng chưa có đủ chỉ số bàn giao đúng ngày bắt đầu.");
        if(c.getStartDate().getDayOfMonth()!=1)throw conflict("PARTIAL_MONTH_UNSUPPORTED","Hợp đồng có tháng lẻ cần quy tắc tính tiền được thống nhất trước.");
        if(invoices.existsByContractIdAndStatus(c.getId(),RentalInvoice.Status.DRAFT))throw conflict("BILLING_SEQUENCE_CONFLICT","Cần gửi hóa đơn nháp hiện tại trước khi lập kỳ tiếp theo.");
        var last=invoices.findFirstByContractIdAndStatusOrderByPeriodDesc(c.getId(),RentalInvoice.Status.SENT);
        var period=last.map(i->YearMonth.parse(i.getPeriod()).plusMonths(1)).orElse(YearMonth.from(c.getStartDate()));
        if(period.atEndOfMonth().isAfter(c.getEndDate()))throw conflict("BILLING_PERIOD_OUT_OF_RANGE","Không có kỳ trọn tháng tiếp theo trong hợp đồng.");
        return new Source(period,last.map(RentalInvoice::getElectricityEndReading).orElse(c.getElectricityBaseline()),last.map(RentalInvoice::getWaterEndReading).orElse(c.getWaterBaseline()));
    }
    private static Pageable paging(int p,int s){return PageRequest.of(p,s,Sort.by(Sort.Direction.DESC,"createdAt","id"));}
    private static void owned(RentalContract c,Long owner){if(!c.getApartment().getProperty().getOwner().getId().equals(owner))throw missing();}
    private static String str(BigDecimal x){return x.toPlainString();}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hóa đơn hoặc hợp đồng thuộc tài khoản của bạn.");}
    private static ApiException conflict(String code,String message){return new ApiException(HttpStatus.CONFLICT,code,message);}
    private static ApiException bad(String code,String message){return new ApiException(HttpStatus.BAD_REQUEST,code,message);}
    private InvoiceResponse response(RentalInvoice i){var c=i.getContract();var a=c.getApartment();var payment=payments.findByInvoiceId(i.getId()).orElse(null);return new InvoiceResponse(i.getId(),c.getId(),a.getId(),c.getCustomer().getId(),a.getRoomNumber(),a.getTitle(),c.getCustomer().getFullName(),i.getPeriod(),i.getDueDate(),str(i.getMonthlyRent()),str(i.getElectricityStartReading()),str(i.getElectricityEndReading()),str(i.getElectricityQuantity()),str(i.getElectricityUnitPrice()),str(i.getElectricityAmount()),str(i.getWaterStartReading()),str(i.getWaterEndReading()),str(i.getWaterQuantity()),str(i.getWaterUnitPrice()),str(i.getWaterAmount()),str(i.getTotalAmount()),i.getStatus().name(),i.getCreatedAt(),i.getSentAt(),i.getVersion(),payment!=null&&payment.getPaidAt()!=null?"PAID":"UNPAID",payment==null?null:payment.getPaidAt(),i.getWaterBillingMode().name(),i.getOccupantCount(),str(i.getInternetFee()),str(i.getGarbageFee()));}
}
