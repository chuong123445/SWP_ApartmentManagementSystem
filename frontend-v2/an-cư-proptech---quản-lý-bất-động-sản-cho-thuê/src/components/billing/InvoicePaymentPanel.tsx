import { useEffect, useState, type ReactNode } from 'react';
import { paymentApi, type InvoicePayment, type TestReceipt } from '@/services/payment/sepayService';
import { billingMoney } from '@/services/billing/billingService';

export function InvoicePaymentPanel({ invoiceId, additional = false, tenant = false, fallback }: {
  invoiceId: string;
  additional?: boolean;
  tenant?: boolean;
  fallback?: ReactNode;
}) {
  const [data, setData] = useState<InvoicePayment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function refresh() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const payment = additional
          ? (await paymentApi<TestReceipt>(`/me/payments/sepay/test-payments/${invoiceId}`, 'GET', undefined, controller.signal)).payment
          : await paymentApi<InvoicePayment>(`/invoices/${invoiceId}/payment`, 'GET', undefined, controller.signal);
        if (!controller.signal.aborted) {
          setData(payment);
          setError('');
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không thể tải thanh toán.');
      } finally {
        inFlight = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 10000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [invoiceId, revision, additional]);

  async function generate() {
    if (busy || additional || !tenant) return;
    setBusy(true);
    setError('');
    try {
      setData(await paymentApi<InvoicePayment>(`/invoices/${invoiceId}/payment`, 'POST'));
      setRevision(value => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể tạo mã QR.');
    } finally {
      setBusy(false);
    }
  }

  if (tenant && data?.status === 'NOT_CONFIGURED' && fallback) return <>{fallback}</>;
  return <section aria-label="Thanh toán hóa đơn" className="mt-6 border-t pt-5 space-y-3">
    <h2 className="font-bold text-lg">Thanh toán hóa đơn</h2>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {!data && !error && <p role="status">Đang tải trạng thái thanh toán...</p>}
    {data?.status === 'PAID' && <p role="status" className="rounded-xl p-4 bg-emerald-50 text-emerald-800">
      Đã thanh toán qua SePay{data.paidAt && ` · Ghi nhận ${new Date(data.paidAt).toLocaleString('vi-VN')}`}
    </p>}
    {data?.status === 'UNPAID' && <p role="status" className="text-amber-800">Chưa thanh toán</p>}
    {data?.status === 'PLATFORM_UNAVAILABLE' && <p className="text-amber-800">Hệ thống chưa sẵn sàng nhận thanh toán. Vui lòng thử lại sau.</p>}
    {data?.status === 'NOT_CONFIGURED' && <p className="text-amber-800">Chưa có kết nối thanh toán SePay.</p>}
    {data?.amount && <p className="font-semibold">Số tiền: {billingMoney(data.amount)}</p>}
    {data?.bank && <p>Ngân hàng: {data.bank}</p>}
    {data?.accountNumber && <p className="break-all">Tài khoản nhận: {data.accountNumber}</p>}
    {data?.accountHolderName && <p>Chủ tài khoản: {data.accountHolderName}</p>}
    {data?.paymentCode && <p className="break-all">Nội dung: <strong>{data.paymentCode}</strong></p>}
    {tenant && data?.status === 'UNPAID' && (data.qrUrl
      ? <div className="space-y-2">
          <img src={data.qrUrl} alt="QR chuyển khoản hóa đơn SePay" referrerPolicy="no-referrer" className="w-72 max-w-full mx-auto rounded-lg" />
          <p className="text-sm text-slate-600">Chuyển đúng số tiền và giữ nguyên nội dung. Trạng thái tự cập nhật khi hệ thống ghi nhận giao dịch.</p>
        </div>
      : !additional && <button type="button" disabled={busy} onClick={() => void generate()} className="bg-brand-700 text-white rounded-lg px-4 py-3 disabled:opacity-50">
          {busy ? 'Đang tạo QR...' : 'Hiển thị QR thanh toán SePay'}
        </button>)}
    <button type="button" onClick={() => setRevision(value => value + 1)} className="block underline text-sm text-emerald-800">Kiểm tra trạng thái thanh toán</button>
  </section>;
}
