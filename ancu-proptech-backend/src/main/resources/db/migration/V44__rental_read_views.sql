-- Private read models, not grants or a replacement for application ownership checks.
-- Grain: one contract / apartment / invoice / typed request / account respectively.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER VIEW dbo.vw_customer_tenancy_history
AS
SELECT c.id contract_id,c.customer_id,
    COALESCE(JSON_VALUE(j.snapshot_json,'$.customer.fullName'),customer.full_name) customer_name,
    customer.full_name customer_display_name,
    CASE WHEN JSON_VALUE(j.snapshot_json,'$.customer.fullName') IS NOT NULL THEN 'CONTRACT_SNAPSHOT' ELSE 'CURRENT_ACCOUNT' END customer_name_source,
    p.owner_id,
    COALESCE(JSON_VALUE(j.snapshot_json,'$.owner.fullName'),owner.full_name) owner_name,
    owner.full_name owner_display_name,
    CASE WHEN JSON_VALUE(j.snapshot_json,'$.owner.fullName') IS NOT NULL THEN 'CONTRACT_SNAPSHOT' ELSE 'CURRENT_ACCOUNT' END owner_name_source,
    p.id property_id,COALESCE(JSON_VALUE(j.snapshot_json,'$.asset.propertyName'),p.name) property_name,
    a.id apartment_id,COALESCE(JSON_VALUE(j.snapshot_json,'$.asset.roomNumber'),a.room_number) room_number,
    c.start_date agreed_start_date,c.end_date agreed_end_date,c.monthly_rent,c.status contract_status,
    c.activated_at,c.ended_at,c.end_reason,c.renewal_of_contract_id,c.local_fixture,
    d.id document_id,d.owner_signed_at,d.customer_signed_at,
    CAST(CASE WHEN d.owner_signed_at IS NOT NULL AND d.customer_signed_at IS NOT NULL THEN 1 ELSE 0 END AS bit) both_parties_signed,
    CASE WHEN c.activated_at IS NOT NULL THEN 'RECORDED_ACTIVATION'
         WHEN c.status='ACTIVE' THEN 'LEGACY_ACTIVE_TIME_UNKNOWN'
         WHEN c.status='ENDED' AND c.end_reason IN('HANDOVER','RENEWED') THEN 'LEGACY_ENDED_TIME_UNKNOWN'
         WHEN c.status='ENDED' AND c.end_reason='RENEWAL_CANCELLED' THEN 'CANCELLED_BEFORE_ACTIVATION'
         WHEN c.status='ENDED' THEN 'UNKNOWN_ENDED_HISTORY'
         ELSE 'NOT_ACTIVATED' END activation_evidence,
    CAST(CASE WHEN c.start_date<=clock.today AND
         (c.activated_at IS NOT NULL OR c.status='ACTIVE' OR (c.status='ENDED' AND c.end_reason IN('HANDOVER','RENEWED')))
         THEN 1 ELSE 0 END AS bit) has_started_tenancy,
    CAST(CASE WHEN c.status='ACTIVE' AND c.start_date<=clock.today THEN 1 ELSE 0 END AS bit) is_current_tenant,
    CASE WHEN c.status='DRAFT' AND d.owner_signed_at IS NOT NULL AND d.customer_signed_at IS NOT NULL THEN 'SIGNED_WAITING_ACTIVATION'
         WHEN c.status='DRAFT' THEN 'DRAFT'
         WHEN c.status='ACTIVE' AND c.start_date>clock.today THEN 'ACTIVE_BEFORE_START'
         WHEN c.status='ACTIVE' AND c.end_date<clock.today THEN 'EXPIRED_PENDING_RESOLUTION'
         WHEN c.status='ACTIVE' THEN 'CURRENT'
         WHEN c.status='ENDED' AND c.end_reason='RENEWAL_CANCELLED' AND c.activated_at IS NULL THEN 'CANCELLED_BEFORE_ACTIVATION'
         ELSE 'ENDED' END tenancy_stage
FROM dbo.rental_contracts c
JOIN dbo.auth_accounts customer ON customer.id=c.customer_id
JOIN dbo.rental_apartments a ON a.id=c.apartment_id
JOIN dbo.rental_properties p ON p.id=a.property_id
JOIN dbo.auth_accounts owner ON owner.id=p.owner_id
LEFT JOIN dbo.contract_drafts d ON d.contract_id=c.id
CROSS APPLY (VALUES(CASE WHEN ISJSON(d.snapshot_json)=1 THEN d.snapshot_json ELSE N'{}' END)) j(snapshot_json)
CROSS APPLY (VALUES(CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time'))) clock(today);
GO
CREATE OR ALTER VIEW dbo.vw_apartment_rental_overview
AS
SELECT a.id apartment_id,a.room_number,a.title,p.id property_id,p.name property_name,p.owner_id,owner.full_name owner_name,
    p.approval_status,p.right_type,p.rights_valid_from,p.rights_valid_until,
    a.publication_status,a.availability,a.advertised_monthly_rent,
    current_lease.contract_id active_contract_id,current_lease.customer_id,current_lease.customer_name,
    current_lease.agreed_start_date,current_lease.agreed_end_date,current_lease.activated_at,current_lease.tenancy_stage,
    CAST(COALESCE(totals.active_contract_count,0) AS bigint) active_contract_count,
    CAST(COALESCE(totals.draft_contract_count,0) AS bigint) draft_contract_count,
    (SELECT COUNT_BIG(*) FROM dbo.rental_requests r WHERE r.apartment_id=a.id AND r.status='PENDING'
      AND NOT EXISTS(SELECT 1 FROM dbo.contract_drafts d JOIN dbo.rental_contracts c ON c.id=d.contract_id
                     WHERE d.rental_request_id=r.id AND c.renewal_of_contract_id IS NOT NULL)) pending_new_request_count,
    CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.contract_handovers h JOIN dbo.rental_contracts c ON c.id=h.contract_id
        WHERE c.apartment_id=a.id AND c.status='ACTIVE' AND h.status='PENDING') THEN 1 ELSE 0 END AS bit) has_pending_handover
FROM dbo.rental_apartments a JOIN dbo.rental_properties p ON p.id=a.property_id JOIN dbo.auth_accounts owner ON owner.id=p.owner_id
OUTER APPLY (SELECT TOP(1) h.contract_id,h.customer_id,h.customer_name,h.agreed_start_date,h.agreed_end_date,h.activated_at,h.tenancy_stage
    FROM dbo.vw_customer_tenancy_history h WHERE h.apartment_id=a.id AND h.contract_status='ACTIVE'
    ORDER BY h.agreed_start_date DESC,h.contract_id DESC) current_lease
OUTER APPLY (SELECT SUM(CASE WHEN c.status='ACTIVE' THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END) active_contract_count,
    SUM(CASE WHEN c.status='DRAFT' THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END) draft_contract_count
    FROM dbo.rental_contracts c WHERE c.apartment_id=a.id) totals;
GO
CREATE OR ALTER VIEW dbo.vw_invoice_payment_status
AS
SELECT i.id invoice_id,i.contract_id,c.customer_id,customer.full_name customer_display_name,
    p.owner_id,a.property_id,p.name property_name,a.id apartment_id,a.room_number,
    i.period,i.due_date,i.total_amount,i.status issuance_status,i.created_at,i.sent_at,
    payment.id payment_id,payment.paid_at,
    CASE WHEN payment.paid_at IS NOT NULL THEN 'PAID' ELSE 'UNPAID' END payment_status,
    CAST(CASE WHEN i.status='SENT' AND payment.paid_at IS NULL THEN 1 ELSE 0 END AS bit) is_payable_unpaid,
    CAST(CASE WHEN i.status='SENT' AND payment.paid_at IS NULL AND i.due_date<clock.today THEN 1 ELSE 0 END AS bit) is_overdue,
    CASE WHEN i.status='DRAFT' THEN 'DRAFT' WHEN payment.paid_at IS NOT NULL THEN 'PAID'
         WHEN i.due_date<clock.today THEN 'OVERDUE' ELSE 'UNPAID' END collection_stage,
    CASE WHEN i.status='SENT' AND payment.paid_at IS NULL THEN i.total_amount ELSE CAST(0 AS decimal(31,4)) END amount_due,
    CASE WHEN payment.paid_at IS NOT NULL THEN payment.amount ELSE CAST(0 AS decimal(31,4)) END paid_amount
FROM dbo.rental_invoices i JOIN dbo.rental_contracts c ON c.id=i.contract_id JOIN dbo.auth_accounts customer ON customer.id=c.customer_id
JOIN dbo.rental_apartments a ON a.id=c.apartment_id JOIN dbo.rental_properties p ON p.id=a.property_id
LEFT JOIN dbo.invoice_payments payment ON payment.invoice_id=i.id
CROSS APPLY (VALUES(CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time'))) clock(today);
GO
CREATE OR ALTER VIEW dbo.vw_owner_request_inbox
AS
SELECT CONCAT('NEW:',r.id) request_key,CAST('NEW' AS varchar(8)) request_type,r.id request_id,
    p.owner_id,p.id property_id,a.id apartment_id,a.room_number,r.customer_id,customer.full_name customer_display_name,
    r.status request_status,r.created_at,r.decided_at,r.decision_reason,r.version request_version,
    c.id contract_id,c.id result_contract_id,c.status result_contract_status,d.owner_signed_at,d.customer_signed_at,
    CAST(CASE WHEN r.status='PENDING' THEN 'PENDING' WHEN r.status='REJECTED' THEN 'REJECTED' WHEN r.status='CANCELLED' THEN 'CANCELLED'
        WHEN d.owner_signed_at IS NOT NULL AND d.customer_signed_at IS NOT NULL THEN 'SIGNED' ELSE 'CONTRACTING' END AS varchar(24)) processing_stage
FROM dbo.rental_requests r JOIN dbo.rental_apartments a ON a.id=r.apartment_id JOIN dbo.rental_properties p ON p.id=a.property_id
JOIN dbo.auth_accounts customer ON customer.id=r.customer_id
LEFT JOIN dbo.contract_drafts d ON d.rental_request_id=r.id LEFT JOIN dbo.rental_contracts c ON c.id=d.contract_id
WHERE c.renewal_of_contract_id IS NULL
UNION ALL
SELECT CONCAT('RENEWAL:',r.id),'RENEWAL',r.id,p.owner_id,p.id,a.id,a.room_number,c.customer_id,customer.full_name,
    r.status,r.created_at,r.decided_at,r.decision_reason,r.version,c.id,successor.id,successor.status,
    d.owner_signed_at,d.customer_signed_at,
    CASE WHEN r.status='PENDING' THEN 'PENDING' WHEN r.status='REJECTED' THEN 'REJECTED' WHEN r.status='CANCELLED' THEN 'CANCELLED'
        WHEN d.owner_signed_at IS NOT NULL AND d.customer_signed_at IS NOT NULL THEN 'SIGNED' ELSE 'CONTRACTING' END
FROM dbo.contract_renewal_requests r JOIN dbo.rental_contracts c ON c.id=r.contract_id
JOIN dbo.rental_apartments a ON a.id=c.apartment_id JOIN dbo.rental_properties p ON p.id=a.property_id
JOIN dbo.auth_accounts customer ON customer.id=c.customer_id
OUTER APPLY(SELECT TOP(1) next_contract.id,next_contract.status FROM dbo.rental_contracts next_contract
    WHERE next_contract.renewal_of_contract_id=c.id ORDER BY CASE WHEN next_contract.status='ENDED' THEN 1 ELSE 0 END,next_contract.id DESC) successor
LEFT JOIN dbo.contract_drafts d ON d.contract_id=successor.id;
GO
CREATE OR ALTER VIEW dbo.vw_account_tenancy_summary
AS
WITH summary AS (
    SELECT customer_id,
        COUNT_BIG(*) total_contract_count,
        SUM(CONVERT(bigint,is_current_tenant)) current_tenancy_count,
        SUM(CASE WHEN tenancy_stage='EXPIRED_PENDING_RESOLUTION' THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END) expired_pending_count,
        SUM(CASE WHEN tenancy_stage='SIGNED_WAITING_ACTIVATION' OR tenancy_stage='ACTIVE_BEFORE_START' THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END) signed_waiting_count,
        COUNT(DISTINCT CASE WHEN has_started_tenancy=1 THEN apartment_id END) ever_rented_apartment_count,
        SUM(CASE WHEN activation_evidence='UNKNOWN_ENDED_HISTORY' THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END) unknown_history_count,
        MIN(activated_at) first_recorded_activation_at,
        MAX(CASE WHEN activation_evidence IN('LEGACY_ACTIVE_TIME_UNKNOWN','LEGACY_ENDED_TIME_UNKNOWN') THEN 1 ELSE 0 END) has_legacy_activation_without_timestamp,
        MAX(CONVERT(int,local_fixture)) has_local_fixture
    FROM dbo.vw_customer_tenancy_history GROUP BY customer_id
)
SELECT account.id account_id,account.full_name display_name,account.role account_role,
    COALESCE(s.total_contract_count,CAST(0 AS bigint)) total_contract_count,
    COALESCE(s.current_tenancy_count,CAST(0 AS bigint)) current_tenancy_count,
    COALESCE(s.expired_pending_count,CAST(0 AS bigint)) expired_pending_count,
    COALESCE(s.signed_waiting_count,CAST(0 AS bigint)) signed_waiting_count,
    COALESCE(s.ever_rented_apartment_count,0) ever_rented_apartment_count,
    COALESCE(s.unknown_history_count,CAST(0 AS bigint)) unknown_history_count,
    s.first_recorded_activation_at,
    CAST(COALESCE(s.has_legacy_activation_without_timestamp,0) AS bit) has_legacy_activation_without_timestamp,
    CAST(COALESCE(s.has_local_fixture,0) AS bit) has_local_fixture,
    CAST(CASE WHEN s.current_tenancy_count>0 THEN 1 ELSE 0 END AS bit) has_current_tenancy
FROM dbo.auth_accounts account LEFT JOIN summary s ON s.customer_id=account.id;
GO
