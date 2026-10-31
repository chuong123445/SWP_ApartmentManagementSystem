-- Seed hóa đơn mẫu T05-T10/2026 cho 2 hợp đồng local_fixture
-- Hợp đồng 1 (id=1): 6,500,000đ/tháng, điện baseline=800, nước baseline=100
-- Hợp đồng 3 (id=3): 5,000,000đ/tháng, điện baseline=1000, nước baseline=200
-- Idempotent: dùng IF NOT EXISTS theo (contract_id, period)

USE proptech_db;

-- ============================================================
-- Hợp đồng id=3: 5,000,000đ/tháng (Xuân Hòa)
-- ============================================================
-- T05/2026: điện 1000→1050 (50kWh x 3500 = 175,000), nước 200→210 (10m³ x 15000 = 150,000)
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=3 AND period='2026-05')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (3, '2026-05', '2026-05-15', 5000000,
  1000.00, 1050.00, 50.00, 3500.00, 175000.0000,
  200.00, 210.00, 10.00, 15000.00, 150000.0000,
  5325000.0000, 'SENT', '2026-05-01T00:00:00.000000Z', '2026-05-01T00:00:00.000000Z', 0);

-- T06/2026: điện 1050→1100, nước 210→220
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=3 AND period='2026-06')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (3, '2026-06', '2026-06-15', 5000000,
  1050.00, 1100.00, 50.00, 3500.00, 175000.0000,
  210.00, 220.00, 10.00, 15000.00, 150000.0000,
  5325000.0000, 'SENT', '2026-06-01T00:00:00.000000Z', '2026-06-01T00:00:00.000000Z', 0);

-- T07/2026: điện 1100→1150, nước 220→230
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=3 AND period='2026-07')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (3, '2026-07', '2026-07-15', 5000000,
  1100.00, 1150.00, 50.00, 3500.00, 175000.0000,
  220.00, 230.00, 10.00, 15000.00, 150000.0000,
  5325000.0000, 'SENT', '2026-07-01T00:00:00.000000Z', '2026-07-01T00:00:00.000000Z', 0);

-- T08/2026: điện 1150→1200, nước 230→240
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=3 AND period='2026-08')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (3, '2026-08', '2026-08-15', 5000000,
  1150.00, 1200.00, 50.00, 3500.00, 175000.0000,
  230.00, 240.00, 10.00, 15000.00, 150000.0000,
  5325000.0000, 'SENT', '2026-08-01T00:00:00.000000Z', '2026-08-01T00:00:00.000000Z', 0);

-- T09/2026: điện 1200→1250, nước 240→250
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=3 AND period='2026-09')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (3, '2026-09', '2026-09-15', 5000000,
  1200.00, 1250.00, 50.00, 3500.00, 175000.0000,
  240.00, 250.00, 10.00, 15000.00, 150000.0000,
  5325000.0000, 'SENT', '2026-09-01T00:00:00.000000Z', '2026-09-01T00:00:00.000000Z', 0);

-- T10/2026: điện 1250→1300, nước 250→260
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=3 AND period='2026-10')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (3, '2026-10', '2026-10-15', 5000000,
  1250.00, 1300.00, 50.00, 3500.00, 175000.0000,
  250.00, 260.00, 10.00, 15000.00, 150000.0000,
  5325000.0000, 'SENT', '2026-10-01T00:00:00.000000Z', '2026-10-01T00:00:00.000000Z', 0);

-- ============================================================
-- Hợp đồng id=1: 6,500,000đ/tháng (Hải Châu)
-- ============================================================
-- T05/2026: điện 800→850, nước 100→110
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=1 AND period='2026-05')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (1, '2026-05', '2026-05-15', 6500000,
  800.00, 850.00, 50.00, 3500.00, 175000.0000,
  100.00, 110.00, 10.00, 15000.00, 150000.0000,
  6825000.0000, 'SENT', '2026-05-01T00:00:00.000000Z', '2026-05-01T00:00:00.000000Z', 0);

-- T06/2026
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=1 AND period='2026-06')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (1, '2026-06', '2026-06-15', 6500000,
  850.00, 900.00, 50.00, 3500.00, 175000.0000,
  110.00, 120.00, 10.00, 15000.00, 150000.0000,
  6825000.0000, 'SENT', '2026-06-01T00:00:00.000000Z', '2026-06-01T00:00:00.000000Z', 0);

-- T07/2026
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=1 AND period='2026-07')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (1, '2026-07', '2026-07-15', 6500000,
  900.00, 950.00, 50.00, 3500.00, 175000.0000,
  120.00, 130.00, 10.00, 15000.00, 150000.0000,
  6825000.0000, 'SENT', '2026-07-01T00:00:00.000000Z', '2026-07-01T00:00:00.000000Z', 0);

-- T08/2026
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=1 AND period='2026-08')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (1, '2026-08', '2026-08-15', 6500000,
  950.00, 1000.00, 50.00, 3500.00, 175000.0000,
  130.00, 140.00, 10.00, 15000.00, 150000.0000,
  6825000.0000, 'SENT', '2026-08-01T00:00:00.000000Z', '2026-08-01T00:00:00.000000Z', 0);

-- T09/2026
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=1 AND period='2026-09')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (1, '2026-09', '2026-09-15', 6500000,
  1000.00, 1050.00, 50.00, 3500.00, 175000.0000,
  140.00, 150.00, 10.00, 15000.00, 150000.0000,
  6825000.0000, 'SENT', '2026-09-01T00:00:00.000000Z', '2026-09-01T00:00:00.000000Z', 0);

-- T10/2026
IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE contract_id=1 AND period='2026-10')
INSERT INTO rental_invoices (contract_id, period, due_date, monthly_rent,
  electricity_start_reading, electricity_end_reading, electricity_quantity, electricity_unit_price, electricity_amount,
  water_start_reading, water_end_reading, water_quantity, water_unit_price, water_amount,
  total_amount, status, created_at, sent_at, version)
VALUES (1, '2026-10', '2026-10-15', 6500000,
  1050.00, 1100.00, 50.00, 3500.00, 175000.0000,
  150.00, 160.00, 10.00, 15000.00, 150000.0000,
  6825000.0000, 'SENT', '2026-10-01T00:00:00.000000Z', '2026-10-01T00:00:00.000000Z', 0);

-- Seed invoice_notifications cho mỗi hóa đơn vừa insert
-- (dùng NOT EXISTS để idempotent)
INSERT INTO invoice_notifications (invoice_id, customer_id, created_at)
SELECT i.id, c.customer_id, i.sent_at
FROM rental_invoices i
JOIN rental_contracts c ON c.id = i.contract_id
WHERE c.local_fixture = 1
  AND NOT EXISTS (SELECT 1 FROM invoice_notifications n WHERE n.invoice_id = i.id);

SELECT 'Seeded: ' + CAST(COUNT(*) AS VARCHAR) + ' invoices' AS result
FROM rental_invoices i
JOIN rental_contracts c ON c.id = i.contract_id
WHERE c.local_fixture = 1;
