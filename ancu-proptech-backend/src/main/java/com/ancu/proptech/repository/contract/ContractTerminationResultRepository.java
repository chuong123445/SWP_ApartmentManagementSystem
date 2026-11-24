package com.ancu.proptech.repository.contract;
import com.ancu.proptech.dto.contract.ContractTerminationResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import java.util.*;
@Repository @RequiredArgsConstructor
public class ContractTerminationResultRepository {
 private final NamedParameterJdbcTemplate jdbc;
 public List<ContractTerminationResult> latest(Long actor,List<Long> ids){
  return jdbc.query("""
   WITH ranked AS (
    SELECT e.*,CASE WHEN e.actor_id=p.owner_id THEN 'OWNER' ELSE 'CUSTOMER' END actor_role,
     ROW_NUMBER() OVER(PARTITION BY e.contract_id ORDER BY e.id DESC) rank_number
    FROM contract_exit_events e JOIN rental_contracts c ON c.id=e.contract_id
    JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id
    WHERE (p.owner_id=:actor OR c.customer_id=:actor) AND c.id IN (:ids)
     AND e.action IN ('PROPOSE_TERMINATION','ACCEPT_TERMINATION','REJECT_TERMINATION','WITHDRAW_TERMINATION')
   )
   SELECT contract_id,action,actor_id,actor_name,actor_role,created_at,reason,
    JSON_VALUE(after_json,'$.termination.reason') proposal_reason,JSON_VALUE(after_json,'$.termination.returnDate') return_date
   FROM ranked WHERE rank_number=1
   """,Map.of("actor",actor,"ids",ids),(rs,index)->new ContractTerminationResult(rs.getString("contract_id"),switch(rs.getString("action")){case "PROPOSE_TERMINATION"->"PENDING";case "ACCEPT_TERMINATION"->"AGREED";case "REJECT_TERMINATION"->"REJECTED";default->"WITHDRAWN";},rs.getString("action"),rs.getString("actor_id"),rs.getString("actor_name"),rs.getString("actor_role"),rs.getTimestamp("created_at",Calendar.getInstance(TimeZone.getTimeZone("UTC"))).toInstant(),rs.getString("reason"),rs.getString("proposal_reason"),rs.getString("return_date")));
 }
}
