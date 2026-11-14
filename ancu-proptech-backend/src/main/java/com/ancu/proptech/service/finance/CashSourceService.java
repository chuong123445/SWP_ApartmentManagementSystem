package com.ancu.proptech.service.finance;
import com.ancu.proptech.dto.finance.CashDtos.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.finance.CashEntry;
import com.ancu.proptech.model.finance.CashEntry.*;
import com.ancu.proptech.repository.finance.CashEntryRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.repository.payment.InvoicePaymentRepository;
import com.ancu.proptech.repository.maintenance.MaintenanceTicketRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.apartment.ApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.math.*;
import java.time.*;
import java.util.*;
@Service @RequiredArgsConstructor
public class CashSourceService {
 private final AccountAccessService access;private final PropertyRepository properties;private final CashEntryRepository entries;
 private final RentalInvoiceRepository invoices;private final InvoicePaymentRepository payments;private final MaintenanceTicketRepository tickets;
 private final CashEntryService cash;private final NamedParameterJdbcTemplate jdbc;
 private static final ZoneId ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
 private static final String SOURCES="""
 SELECT 'INVOICE' type,i.id,p.id property_id,p.name property_name,CONCAT(N'Hóa đơn ',i.period,N' · ',a.room_number) title,i.total_amount amount,
 CONVERT(date,DATEADD(hour,7,ip.paid_at)) suggested_date
 FROM rental_invoices i JOIN invoice_payments ip ON ip.invoice_id=i.id JOIN rental_contracts c ON c.id=i.contract_id JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id
 WHERE p.owner_id=:owner AND ip.owner_id=:owner AND (:property IS NULL OR p.id=:property) AND i.status='SENT' AND ip.paid_at>=:fromDate AND ip.paid_at<:untilDate
 AND ip.amount=i.total_amount AND NOT EXISTS(SELECT 1 FROM cash_entries e WHERE e.source_invoice_id=i.id)
 UNION ALL
 SELECT 'MAINTENANCE',t.id,p.id,p.name,t.title,t.actual_cost-t.customer_cost,:today
 FROM maintenance_tickets t JOIN rental_properties p ON p.id=t.property_id
 WHERE p.owner_id=:owner AND (:property IS NULL OR p.id=:property) AND t.status='RESOLVED' AND t.actual_cost>t.customer_cost AND t.customer_cost>=0
 AND NOT EXISTS(SELECT 1 FROM cash_entries e WHERE e.source_maintenance_id=t.id)
 """;
 @Transactional(readOnly=true) public PageResponse<SourceItem> sources(Jwt jwt,Long propertyId,String month,int page,int size){
  ApartmentService.validatePage(page,size);var owner=access.owner(jwt);YearMonth m;
  try{if(month==null||!month.matches("[0-9]{4}-[0-9]{2}"))throw new IllegalArgumentException();m=YearMonth.parse(month);if(m.getYear()<1900||m.getYear()>9998)throw new IllegalArgumentException();}catch(RuntimeException e){throw bad("Tháng không hợp lệ.");}
  if(propertyId!=null)properties.findById(propertyId).filter(p->p.getOwner().getId().equals(owner.getId())).orElseThrow(CashSourceService::missing);
  var args=new HashMap<String,Object>();args.put("owner",owner.getId());args.put("property",propertyId);args.put("fromDate",LocalDateTime.ofInstant(m.atDay(1).atStartOfDay(ZONE).toInstant(),ZoneOffset.UTC));args.put("untilDate",LocalDateTime.ofInstant(m.plusMonths(1).atDay(1).atStartOfDay(ZONE).toInstant(),ZoneOffset.UTC));args.put("today",LocalDate.now(ZONE));args.put("offset",page*size);args.put("size",size);
  var count=jdbc.queryForObject("SELECT COUNT_BIG(*) FROM ("+SOURCES+") s",args,Long.class);
  var list=jdbc.query("SELECT * FROM ("+SOURCES+") s ORDER BY type,id DESC OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY",args,(r,n)->new SourceItem(r.getString("type"),r.getLong("id"),r.getLong("property_id"),r.getString("property_name"),r.getString("title"),r.getBigDecimal("amount").toPlainString(),r.getDate("suggested_date").toLocalDate()));
  return PageResponse.from(new PageImpl<>(list,PageRequest.of(page,size),count));
 }
 @Transactional public Entry create(Jwt jwt,SourceCreate input){
  var owner=access.owner(jwt);Long propertyId;BigDecimal amount;String category,who,description,reference;LocalDate date;Method method;
  if(input.type()==SourceType.INVOICE){
   var i=invoices.findWithContractById(input.id()).orElseThrow(CashSourceService::missing);propertyId=i.getContract().getApartment().getProperty().getId();
   properties.findOwnedForCreation(propertyId,owner.getId()).orElseThrow(CashSourceService::missing);
   var prior=entries.findBySourceInvoiceId(input.id());if(prior.isPresent())return cash.detail(jwt,prior.get().getId());
   var paid=payments.findByInvoiceId(input.id()).filter(p->owner.getId().equals(p.getOwnerId())&&p.getPaidAt()!=null&&p.getAmount().compareTo(i.getTotalAmount())==0).orElseThrow(()->bad("Hóa đơn chưa được xác nhận thanh toán đủ."));
   if(i.getStatus()!=com.ancu.proptech.model.billing.RentalInvoice.Status.SENT)throw bad("Chỉ ghi thu hóa đơn đã gửi.");
   amount=i.getTotalAmount();date=paid.getPaidAt().atZone(ZONE).toLocalDate();method=Method.BANK_TRANSFER;category="Thu tiền hóa đơn";who=i.getContract().getCustomer().getFullName();description="Thu hóa đơn kỳ "+i.getPeriod()+" · "+i.getContract().getApartment().getRoomNumber();reference="INVOICE:"+i.getId();
  }else{
   var t=tickets.findById(input.id()).orElseThrow(CashSourceService::missing);propertyId=t.getProperty().getId();properties.findOwnedForCreation(propertyId,owner.getId()).orElseThrow(CashSourceService::missing);
   var prior=entries.findBySourceMaintenanceId(input.id());if(prior.isPresent())return cash.detail(jwt,prior.get().getId());
   if(t.getStatus()!=com.ancu.proptech.model.maintenance.MaintenanceTicket.Status.RESOLVED||t.getActualCost()==null||t.getCustomerCost()==null||t.getCustomerCost().signum()<0)throw bad("Sự cố chưa nghiệm thu hoặc chưa phân bổ chi phí.");
   amount=t.getActualCost().subtract(t.getCustomerCost());date=input.transactionDate();method=input.paymentMethod();category="Sửa chữa và bảo trì";who=t.getTechnicianName()==null||t.getTechnicianName().isBlank()?"Đơn vị sửa chữa":t.getTechnicianName();description="Chi phần chủ nhà chịu: "+t.getTitle();reference="MAINTENANCE:"+t.getId();
  }
  try{amount=amount.setScale(2,RoundingMode.UNNECESSARY);if(amount.signum()<=0||amount.precision()-amount.scale()>13)throw new ArithmeticException();}catch(ArithmeticException e){throw bad("Số tiền nguồn không phù hợp giới hạn sổ quỹ; cần kiểm tra đối soát.");}
  var dto=cash.create(jwt,new Create(propertyId,UUID.nameUUIDFromBytes(reference.getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString(),input.type()==SourceType.INVOICE?Direction.INCOME:Direction.EXPENSE,method,amount,date,category,who,description,reference));
  var e=entries.findById(dto.id()).orElseThrow(CashSourceService::missing);if(input.type()==SourceType.INVOICE)e.setSourceInvoiceId(input.id());else e.setSourceMaintenanceId(input.id());entries.flush();return cash.detail(jwt,e.getId());
 }
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy nguồn thuộc tài khoản của bạn.");}
 private static ApiException bad(String message){return new ApiException(HttpStatus.CONFLICT,"CASH_SOURCE_INVALID",message);}
}
