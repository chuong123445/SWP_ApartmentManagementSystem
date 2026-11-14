-- Explicit local-only paid sample data; no real bank transfer or provider event.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'Local date/database guard.',1;
IF NOT EXISTS(SELECT 1 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id
 WHERE c.id=29 AND c.local_fixture=1 AND c.status='ACTIVE' AND c.customer_id=2 AND a.id=16 AND a.room_number='HH205.TEST' AND p.owner_id=3
 AND c.start_date='20260812' AND c.end_date='20261112' AND c.monthly_rent=8500000 AND c.rent_cycle_months=1 AND c.rent_payment_day=5 AND c.billing_version=0)
 OR EXISTS(SELECT 1 FROM rental_invoices WHERE contract_id=29)
 OR EXISTS(SELECT 1 FROM contract_exit_cases WHERE contract_id=29)
 OR EXISTS(SELECT 1 FROM contract_handovers WHERE contract_id=29)
 THROW 51000,'Exact reviewed empty expired demo guard failed; do not rerun.',1;
UPDATE rental_contracts SET start_date='20250901',end_date='20261031',baseline_date='20250901',activated_at=CONVERT(datetime2,'20250901'),rent_cycle_months=6,billing_version=billing_version+1,version=version+1 WHERE id=29;
UPDATE contract_drafts SET content_version=content_version+1,usage_purpose=N'[MẪU] Demo 14 tháng, chu kỳ 6 tháng, hóa đơn đã thanh toán local. Ảnh chữ ký minh họa từ mẫu cũ, không phải thỏa thuận/giao dịch thực.' WHERE contract_id=29 AND signed_content_hash IS NULL;
IF @@ROWCOUNT<>1 THROW 51000,'Expected unsigned-hash local demo draft.',1;
DECLARE @Month date='20250901',@Invoice bigint,@Now datetime2(6)=SYSUTCDATETIME(),@After nvarchar(max),@Before nvarchar(max),@Months int,@End date;
DECLARE @Result TABLE(invoice_id bigint,period varchar(7),amount decimal(17,2),months int,coverage_end date,payment_code varchar(28));
WHILE @Month<='20261001'
BEGIN
 SET @Months=CASE WHEN DATEDIFF(month,@Month,CONVERT(date,'20261101'))<6 THEN DATEDIFF(month,@Month,CONVERT(date,'20261101')) ELSE 6 END;
 SET @End=DATEADD(day,-1,DATEADD(month,@Months,@Month));
 INSERT INTO rental_invoices(contract_id,period,due_date,monthly_rent,electricity_start_reading,electricity_end_reading,electricity_quantity,electricity_unit_price,electricity_amount,
 water_start_reading,water_end_reading,water_quantity,water_unit_price,water_amount,total_amount,status,created_at,sent_at,version,water_billing_mode,occupant_count,internet_fee,garbage_fee,kind,coverage_start,coverage_end,rent_months,rent_unit_price,auto_generated)
 SELECT id,CONVERT(varchar(7),@Month,126),DATEADD(day,rent_payment_day-1,@Month),monthly_rent*@Months,0,0,0,0,0,0,0,0,0,0,monthly_rent*@Months,'SENT',@Now,@Now,1,water_billing_mode,occupant_count,0,0,'RENT',@Month,@End,@Months,monthly_rent,0 FROM rental_contracts WHERE id=29;
 SET @Invoice=CONVERT(bigint,SCOPE_IDENTITY());
 -- Same two billing-chain/optimistic version advances as create + send.
 UPDATE rental_contracts SET billing_version=billing_version+2,version=version+2 WHERE id=29;
 INSERT INTO invoice_notifications(invoice_id,customer_id,created_at) VALUES(@Invoice,2,@Now);
 DECLARE @Code varchar(28)=CONCAT('LOCALDEMO29',CONVERT(char(6),@Month,112));
 INSERT INTO invoice_payments(invoice_id,owner_id,collection_owner_id,payment_code,bank,account_number,account_holder_name,amount,paid_at)
 SELECT @Invoice,3,NULL,@Code,'LOCAL_DEMO','LOCAL_DEMO',N'DỮ LIỆU MẪU — KHÔNG GIAO DỊCH',total_amount,@Now FROM rental_invoices WHERE id=@Invoice;
 SET @After=(SELECT CONVERT(varchar(30),i.id) id,CONVERT(varchar(30),i.contract_id) contractId,'16' apartmentId,'2' customerId,
 a.room_number roomNumber,a.title apartmentTitle,u.full_name tenantName,i.period,CONVERT(char(10),i.due_date,23) dueDate,
 CONVERT(varchar(40),i.monthly_rent) monthlyRent,CONVERT(varchar(40),i.total_amount) totalAmount,i.status,
 CONVERT(varchar(33),i.created_at,126)+'Z' createdAt,CONVERT(varchar(33),i.sent_at,126)+'Z' sentAt,i.version,
 i.kind,CONVERT(char(10),i.coverage_start,23) coverageStart,CONVERT(char(10),i.coverage_end,23) coverageEnd,i.rent_months rentMonths,
 CONVERT(varchar(40),i.rent_unit_price) rentUnitPrice,'0' electricityAmount,'0' waterAmount,'0' internetFee,'0' garbageFee,
 c.billing_version billingVersion,'PAID' paymentStatus,CONVERT(varchar(33),@Now,126)+'Z' paidAt
 FROM rental_invoices i JOIN rental_contracts c ON c.id=i.contract_id JOIN rental_apartments a ON a.id=c.apartment_id JOIN auth_accounts u ON u.id=c.customer_id WHERE i.id=@Invoice FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 SET @Before=JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(@After,'$.status','DRAFT'),'$.paymentStatus','UNPAID'),'$.paidAt',NULL);
 SET @Before=JSON_MODIFY(@Before,'$.sentAt',NULL);
 SET @Before=JSON_MODIFY(@Before,'$.version',0);
 INSERT INTO invoice_events(invoice_id,actor_id,action,occurred_at,reason,before_json,after_json)
 VALUES(@Invoice,3,'CREATED',@Now,N'[LOCAL_DEMO] Tạo hóa đơn tiền phòng mẫu theo yêu cầu; không phải giao dịch thực.',NULL,@Before),
 (@Invoice,3,'SENT',@Now,N'[LOCAL_DEMO] Ghi nhận đã thanh toán để demo bàn giao; không gọi SePay/ngân hàng, không cộng số dư.',@Before,@After);
 INSERT INTO @Result SELECT @Invoice,CONVERT(varchar(7),@Month,126),8500000*@Months,@Months,@End,@Code;
 SET @Month=DATEADD(month,@Months,@Month);
END;
IF (SELECT COUNT(*) FROM rental_invoices i JOIN invoice_payments p ON p.invoice_id=i.id WHERE i.contract_id=29 AND i.kind='RENT' AND i.status='SENT' AND p.paid_at IS NOT NULL AND p.amount=i.total_amount AND p.bank='LOCAL_DEMO')<>3
 OR (SELECT SUM(total_amount) FROM rental_invoices WHERE contract_id=29)<>119000000
 OR EXISTS(SELECT 1 FROM contract_exit_cases WHERE contract_id=29)
 THROW 51000,'Paid sample invariant failed.',1;
SELECT * FROM @Result ORDER BY period;
