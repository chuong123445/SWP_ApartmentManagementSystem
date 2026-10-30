package com.ancu.proptech.service.notification;

import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.apartment.ApartmentService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class NotificationService {
 private final NamedParameterJdbcTemplate jdbc;private final AccountAccessService access;
 public record Item(String id,String title,String message,String url,Instant createdAt,boolean read){}
 public record Feed(List<Item> items,int page,int size,long totalElements,int totalPages,long unreadCount,Instant snapshotAt){}
 private static final String FEED="""
 WITH feed AS (
 SELECT CONCAT('request-new:',r.id) notification_key,N'Có yêu cầu thuê mới' title,
 CONCAT(N'Yêu cầu thuê ',a.title,N' — ',COALESCE(a.room_number,N'')) message,
 CONCAT('/app?tab=rental_requests&propertyId=',p.id) url,r.created_at
 FROM rental_requests r JOIN rental_apartments a ON a.id=r.apartment_id JOIN rental_properties p ON p.id=a.property_id
 WHERE p.owner_id=:account AND r.customer_id<>:account
 UNION ALL
 SELECT CONCAT('request-decision:',r.id,':',r.status),N'Yêu cầu thuê đã được xử lý',
 CONCAT(a.title,N': ',CASE r.status WHEN 'ACCEPTED' THEN N'Đã chấp nhận' ELSE N'Đã từ chối' END),'/my/rental-requests',r.decided_at
 FROM rental_requests r JOIN rental_apartments a ON a.id=r.apartment_id
 WHERE r.customer_id=:account AND r.status IN ('ACCEPTED','REJECTED') AND r.decided_at IS NOT NULL
 UNION ALL
 SELECT CONCAT('request-cancelled:',r.id),N'Khách đã hủy yêu cầu thuê',a.title,CONCAT('/app?tab=rental_requests&propertyId=',p.id),r.decided_at
 FROM rental_requests r JOIN rental_apartments a ON a.id=r.apartment_id JOIN rental_properties p ON p.id=a.property_id
 WHERE p.owner_id=:account AND r.customer_id<>:account AND r.status='CANCELLED' AND r.decided_at IS NOT NULL
 UNION ALL
 SELECT CONCAT('invoice:',n.id),N'Bạn có hóa đơn mới',CONCAT(N'Hóa đơn kỳ ',i.period,N' — ',COALESCE(a.room_number,a.title)),CONCAT('/my/invoices/',i.id),n.created_at
 FROM invoice_notifications n JOIN rental_invoices i ON i.id=n.invoice_id JOIN rental_contracts c ON c.id=i.contract_id JOIN rental_apartments a ON a.id=c.apartment_id
 WHERE n.customer_id=:account AND c.customer_id=:account AND i.status='SENT'
 UNION ALL
 SELECT CONCAT('maintenance:',e.id),N'Cập nhật sự cố và bảo trì',
 CONCAT(t.title,N' — ',CASE e.action WHEN 'CREATED' THEN N'Có báo cáo mới' WHEN 'ACCEPT' THEN N'Đã tiếp nhận' WHEN 'ASSIGN' THEN N'Đã phân công thợ' WHEN 'READY' THEN N'Chờ nghiệm thu' WHEN 'CONFIRM' THEN N'Đã nghiệm thu' WHEN 'REOPEN' THEN N'Yêu cầu sửa lại' WHEN 'CANCEL' THEN N'Đã hủy' WHEN 'REJECT' THEN N'Đã từ chối' WHEN 'IMAGE_ADDED' THEN N'Đã thêm ảnh' WHEN 'COST_RECORDED' THEN N'Đã cập nhật chi phí' ELSE N'Có thay đổi' END),
 CASE WHEN p.owner_id=:account THEN CONCAT('/app?tab=maintenance&propertyId=',p.id) ELSE '/my/maintenance' END,e.created_at
 FROM maintenance_events e JOIN maintenance_tickets t ON t.id=e.ticket_id JOIN rental_properties p ON p.id=t.property_id
 WHERE e.actor_id<>:account AND (p.owner_id=:account OR t.tenant_id=:account OR t.reporter_id=:account)
 UNION ALL
 SELECT CONCAT('contract-created:',d.id),N'Chủ nhà đã tạo hợp đồng thuê',CONCAT(N'Hợp đồng phòng ',COALESCE(a.room_number,a.title)),CONCAT('/contracts/',c.id),d.created_at
 FROM contract_drafts d JOIN rental_contracts c ON c.id=d.contract_id JOIN rental_apartments a ON a.id=c.apartment_id WHERE c.customer_id=:account
 UNION ALL
 SELECT CONCAT('contract-owner-signed:',d.id),N'Chủ nhà đã ký hợp đồng',CONCAT(N'Hợp đồng phòng ',COALESCE(a.room_number,a.title)),CONCAT('/contracts/',c.id),d.owner_signed_at
 FROM contract_drafts d JOIN rental_contracts c ON c.id=d.contract_id JOIN rental_apartments a ON a.id=c.apartment_id WHERE c.customer_id=:account AND d.owner_signed_at IS NOT NULL
 UNION ALL
 SELECT CONCAT('contract-customer-signed:',d.id),N'Khách thuê đã ký hợp đồng',CONCAT(N'Hợp đồng phòng ',COALESCE(a.room_number,a.title)),CONCAT('/contracts/',c.id),d.customer_signed_at
 FROM contract_drafts d JOIN rental_contracts c ON c.id=d.contract_id JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=:account AND d.customer_signed_at IS NOT NULL
 UNION ALL
 SELECT CONCAT('contract-ended:',c.id),N'Hợp đồng đã kết thúc',CONCAT(N'Hợp đồng phòng ',COALESCE(a.room_number,a.title)),CONCAT('/contracts/',c.id),c.ended_at
 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE (p.owner_id=:account OR c.customer_id=:account) AND c.status='ENDED' AND c.ended_at IS NOT NULL
 UNION ALL
 SELECT CONCAT('property-notice:',n.id),N'Thông báo thời hạn quyền cho thuê',CONCAT(p.name,N' — thời hạn: ',CONVERT(varchar(10),n.expires_on,23)),'/account/property-notices',n.created_at
 FROM property_right_notices n JOIN rental_properties p ON p.id=n.property_id WHERE n.recipient_id=:account
 UNION ALL
 SELECT CONCAT('dossier-reviewed:',d.id,':',d.status),N'Hồ sơ tài sản đã được xét duyệt',CONCAT(p.name,N' — ',CASE d.status WHEN 'APPROVED' THEN N'Đã duyệt' WHEN 'REJECTED' THEN N'Đã từ chối' ELSE N'Cần bổ sung thông tin' END),CONCAT('/app?tab=properties&propertyId=',p.id),d.reviewed_at
 FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE p.owner_id=:account AND d.reviewed_at IS NOT NULL AND d.status<>'PENDING_APPROVAL'
 UNION ALL
 SELECT CONCAT('dossier-submitted:',d.id),N'Có hồ sơ tài sản được gửi',p.name,'/admin/property-dossiers',d.submitted_at
 FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE :role='ADMIN'
 )
 """;
 private Map<String,Object> params(Jwt jwt){var a=access.account(jwt);return new HashMap<>(Map.of("account",a.getId(),"role",a.getRole().name()));}
 @Transactional(readOnly=true) public Feed list(Jwt jwt,int page,int size){
  ApartmentService.validatePage(page,size);var params=params(jwt);var at=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
  params.put("through",LocalDateTime.ofInstant(at,ZoneOffset.UTC).toString());params.put("offset",Math.multiplyExact((long)page,size));params.put("size",size);
  var counts=jdbc.queryForMap(FEED+"SELECT COUNT_BIG(*) total,COALESCE(SUM(CASE WHEN r.notification_key IS NULL THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END),0) unread FROM feed f LEFT JOIN notification_reads r ON r.account_id=:account AND r.notification_key=f.notification_key WHERE f.created_at<=CAST(:through AS datetime2(6))",params);
  var items=jdbc.query(FEED+"SELECT f.*,r.read_at FROM feed f LEFT JOIN notification_reads r ON r.account_id=:account AND r.notification_key=f.notification_key WHERE f.created_at<=CAST(:through AS datetime2(6)) ORDER BY f.created_at DESC,f.notification_key DESC OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY",params,(rs,row)->new Item(rs.getString("notification_key"),rs.getString("title"),rs.getString("message"),rs.getString("url"),rs.getTimestamp("created_at",Calendar.getInstance(TimeZone.getTimeZone("UTC"))).toInstant(),rs.getTimestamp("read_at")!=null));
  long total=((Number)counts.get("total")).longValue();return new Feed(items,page,size,total,(int)Math.min(Integer.MAX_VALUE,(total+size-1)/size),((Number)counts.get("unread")).longValue(),at);
 }
 @Transactional public void read(Jwt jwt,String id){
  var params=params(jwt);params.put("id",id);
  if(jdbc.queryForObject(FEED+"SELECT COUNT_BIG(*) FROM feed WHERE notification_key=:id",params,Long.class)==0)throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy thông báo thuộc tài khoản của bạn.");
  jdbc.update(FEED+"INSERT INTO notification_reads(account_id,notification_key,read_at) SELECT :account,f.notification_key,SYSUTCDATETIME() FROM feed f WHERE f.notification_key=:id AND NOT EXISTS(SELECT 1 FROM notification_reads r WITH(UPDLOCK,HOLDLOCK) WHERE r.account_id=:account AND r.notification_key=f.notification_key)",params);
 }
 @Transactional public void readAll(Jwt jwt,Instant through){
  if(through==null||through.isAfter(Instant.now())||through.isBefore(Instant.parse("1900-01-01T00:00:00Z")))throw new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Thời điểm đánh dấu đã đọc không hợp lệ.");
  var params=params(jwt);params.put("through",LocalDateTime.ofInstant(through,ZoneOffset.UTC).toString());
  jdbc.update(FEED+"INSERT INTO notification_reads(account_id,notification_key,read_at) SELECT :account,f.notification_key,SYSUTCDATETIME() FROM feed f WHERE f.created_at<=CAST(:through AS datetime2(6)) AND NOT EXISTS(SELECT 1 FROM notification_reads r WITH(UPDLOCK,HOLDLOCK) WHERE r.account_id=:account AND r.notification_key=f.notification_key)",params);
 }
}
