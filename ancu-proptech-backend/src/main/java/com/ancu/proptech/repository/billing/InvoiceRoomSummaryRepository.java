package com.ancu.proptech.repository.billing;
import com.ancu.proptech.dto.billing.InvoiceRoomSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import java.util.List;
@Repository @RequiredArgsConstructor
public class InvoiceRoomSummaryRepository {
 private final NamedParameterJdbcTemplate jdbc;
 public List<InvoiceRoomSummary> rooms(Long ownerId,Long propertyId){
  return jdbc.query("""
   SELECT a.id,a.room_number,a.title,p.id property_id,p.name property_name,
    COUNT(CASE WHEN i.status='SENT' AND pay.paid_at IS NULL THEN 1 END) unpaid_count,
    COALESCE(SUM(CASE WHEN i.status='SENT' AND pay.paid_at IS NULL THEN i.total_amount ELSE 0 END),0) unpaid_amount
   FROM rental_apartments a JOIN rental_properties p ON p.id=a.property_id
   LEFT JOIN rental_contracts c ON c.apartment_id=a.id
   LEFT JOIN rental_invoices i ON i.contract_id=c.id
   LEFT JOIN invoice_payments pay ON pay.invoice_id=i.id
   WHERE p.owner_id=:ownerId AND (:propertyId IS NULL OR p.id=:propertyId)
   GROUP BY a.id,a.room_number,a.title,p.id,p.name ORDER BY p.name,a.room_number,a.id
   """,new MapSqlParameterSource().addValue("ownerId",ownerId).addValue("propertyId",propertyId,java.sql.Types.BIGINT),(rs,n)->new InvoiceRoomSummary(rs.getString("id"),rs.getString("room_number"),rs.getString("title"),rs.getString("property_id"),rs.getString("property_name"),rs.getLong("unpaid_count"),rs.getBigDecimal("unpaid_amount").toPlainString()));
 }
}
