package com.ancu.proptech.service.finance;

import com.ancu.proptech.dto.finance.CashDtos.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.finance.CashEntry;
import com.ancu.proptech.model.finance.CashEntry.*;
import com.ancu.proptech.repository.finance.CashEntryRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.apartment.ApartmentService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.Objects;

@Service @RequiredArgsConstructor
public class CashEntryService {
    private final CashEntryRepository entries;
    private final PropertyRepository properties;
    private final AccountAccessService access;
    private final EntityManager em;

    @Transactional public Entry create(Jwt jwt,Create input) {
        var owner=access.owner(jwt);
        // Lock property to serialize retries before checking the unique request key.
        var property=properties.findOwnedForCreation(input.propertyId(),owner.getId()).orElseThrow(CashEntryService::missing);
        String key=input.requestKey().toLowerCase(java.util.Locale.ROOT);
        var prior=entries.findByPropertyIdAndRequestKey(property.getId(),key);
        if(prior.isPresent()) {
            var e=prior.get();
            if(e.getDirection()!=input.direction() || e.getPaymentMethod()!=input.paymentMethod()
                || e.getAmount().compareTo(input.amount())!=0 || !e.getTransactionDate().equals(input.transactionDate())
                || !e.getCategory().equals(input.category().strip()) || !e.getCounterparty().equals(input.counterparty().strip())
                || !e.getDescription().equals(input.description().strip()) || !Objects.equals(e.getReference(),clean(input.reference())))
                throw conflict("Mã gửi lại đã được sử dụng cho nội dung khác.");
            return response(e);
        }
        if(input.transactionDate().getYear()<1900 || input.transactionDate().isAfter(today()))
            throw bad("Ngày giao dịch phải từ năm 1900 đến hôm nay.");
        var e=new CashEntry();e.setProperty(property);e.setCreatedBy(owner);e.setRequestKey(key);
        e.setDirection(input.direction());e.setPaymentMethod(input.paymentMethod());e.setAmount(input.amount());
        e.setTransactionDate(input.transactionDate());e.setCategory(input.category().strip());e.setCounterparty(input.counterparty().strip());
        e.setDescription(input.description().strip());e.setReference(clean(input.reference()));
        e.setStatus(Status.DRAFT);e.setCreatedAt(Instant.now());return response(entries.saveAndFlush(e));
    }
    @Transactional public Entry post(Jwt jwt,Long id,Post input) {
        var owner=access.owner(jwt);var e=locked(id,owner.getId());checkVersion(e,input.version());
        if(e.getStatus()!=Status.DRAFT)throw conflict("Chỉ xác nhận phiếu đang ở trạng thái nháp.");
        e.setStatus(Status.POSTED);e.setPostedAt(Instant.now());e.setPostedBy(owner);entries.flush();return response(e);
    }
    @Transactional public Entry cancel(Jwt jwt,Long id,Cancel input) {
        var owner=access.owner(jwt);var e=locked(id,owner.getId());checkVersion(e,input.version());
        if(e.getStatus()==Status.CANCELLED)throw conflict("Phiếu đã được hủy.");
        e.setStatus(Status.CANCELLED);e.setCancelledAt(Instant.now());e.setCancelledBy(owner);
        e.setCancellationReason(input.reason().strip());entries.flush();return response(e);
    }
    @Transactional(readOnly=true) public Entry detail(Jwt jwt,Long id) {
        var owner=access.owner(jwt);var e=entries.findOne((r,q,b)->b.and(b.equal(r.get("id"),id),b.equal(r.get("property").get("owner").get("id"),owner.getId()))).orElseThrow(CashEntryService::missing);
        return response(e);
    }
    @Transactional(readOnly=true) public PageResponse<Entry> list(Jwt jwt,Long propertyId,String month,Direction direction,Status status,int page,int size) {
        ApartmentService.validatePage(page,size);var scope=scope(jwt,propertyId,month,direction);
        if(status!=null)scope=scope.and((r,q,b)->b.equal(r.get("status"),status));
        return PageResponse.from(entries.findAll(scope,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"transactionDate","id"))).map(this::response));
    }
    @Transactional(readOnly=true) public Summary summary(Jwt jwt,Long propertyId,String month,Direction direction) {
        var scope=scope(jwt,propertyId,month,direction).and((r,q,b)->b.equal(r.get("status"),Status.POSTED));
        var b=em.getCriteriaBuilder();var q=b.createTupleQuery();var r=q.from(CashEntry.class);
        q.multiselect(r.get("direction"),b.sum(r.<BigDecimal>get("amount")),b.count(r));
        q.where(scope.toPredicate(r,q,b));q.groupBy(r.get("direction"));
        BigDecimal income=BigDecimal.ZERO,expense=BigDecimal.ZERO;long count=0;
        for(var row:em.createQuery(q).getResultList()) {
            if(row.get(0)==Direction.INCOME)income=row.get(1,BigDecimal.class);else expense=row.get(1,BigDecimal.class);
            count+=row.get(2,Long.class);
        }
        return new Summary(income.toPlainString(),expense.toPlainString(),income.subtract(expense).toPlainString(),count);
    }
    private Specification<CashEntry> scope(Jwt jwt,Long propertyId,String month,Direction direction) {
        var owner=access.owner(jwt);YearMonth period;
        try { if(month==null || !month.matches("[0-9]{4}-[0-9]{2}"))throw new IllegalArgumentException();period=YearMonth.parse(month);if(period.getYear()<1900||period.getYear()>9998)throw new IllegalArgumentException(); }
        catch(RuntimeException ex){throw bad("Tháng phải có dạng YYYY-MM, từ năm 1900 đến 9998.");}
        if(propertyId!=null)properties.findById(propertyId).filter(p->p.getOwner().getId().equals(owner.getId())).orElseThrow(CashEntryService::missing);
        LocalDate from=period.atDay(1),until=period.plusMonths(1).atDay(1);
        return (r,q,b)-> {
            var predicate=b.and(b.equal(r.get("property").get("owner").get("id"),owner.getId()),b.greaterThanOrEqualTo(r.get("transactionDate"),from),b.lessThan(r.get("transactionDate"),until));
            if(propertyId!=null)predicate=b.and(predicate,b.equal(r.get("property").get("id"),propertyId));
            if(direction!=null)predicate=b.and(predicate,b.equal(r.get("direction"),direction));return predicate;
        };
    }
    private CashEntry locked(Long id,Long owner) {var e=entries.lockOwned(id,owner).orElseThrow(CashEntryService::missing);em.refresh(e);return e;}
    private static void checkVersion(CashEntry e,long v){if(e.getVersion()!=v)throw conflict("Phiếu đã thay đổi. Hãy tải lại.");}
    private static LocalDate today(){return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));}
    private static String clean(String s){return s==null||s.isBlank()?null:s.strip();}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy phiếu hoặc tài sản thuộc tài khoản của bạn.");}
    private static ApiException conflict(String message){return new ApiException(HttpStatus.CONFLICT,"CASH_ENTRY_CONFLICT",message);}
    private static ApiException bad(String message){return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",message);}
    private Entry response(CashEntry e) {return new Entry(e.getId(),(e.getDirection()==Direction.INCOME?"THU-":"CHI-")+e.getId(),e.getProperty().getId(),e.getProperty().getName(),e.getDirection(),e.getStatus(),e.getPaymentMethod(),e.getAmount().toPlainString(),e.getTransactionDate(),e.getCategory(),e.getCounterparty(),e.getDescription(),e.getReference(),e.getCreatedAt(),e.getPostedAt(),e.getCancelledAt(),e.getCreatedBy().getId(),e.getPostedBy()==null?null:e.getPostedBy().getId(),e.getCancelledBy()==null?null:e.getCancelledBy().getId(),e.getCancellationReason(),e.getVersion());}
}
