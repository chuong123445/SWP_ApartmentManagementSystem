import React from 'react';
import {
  Home,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Zap,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Room, Invoice, MaintenanceTicket, Contract, ActiveTab } from '@/types';
import { calculateMonthlyRevenueData } from '@/utils/reportUtils';

interface DashboardPageProps {
  propertyName: string;
  rooms: Room[];
  invoices: Invoice[];
  tickets: MaintenanceTicket[];
  contracts: Contract[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onOpenRoomModal: (room: Room) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  propertyName,
  rooms,
  invoices,
  tickets,
  contracts,
  onNavigateTab,
  onOpenInvoiceModal,
}) => {
  const totalRooms = rooms.length;
  const rentedRooms = rooms.filter((r) => r.status === 'rented' || r.status === 'expiring').length;
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const overdueRooms = rooms.filter((r) => r.status === 'overdue').length;
  const occupancyRate = totalRooms === 0 ? 0 : Math.round((rentedRooms / totalRooms) * 100);

  const totalInvoiceAmount = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalPaidAmount = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalDebtAmount = totalInvoiceAmount - totalPaidAmount;

  const urgentTickets = tickets.filter((t) => t.status !== 'resolved');
  const expiringContracts = contracts.filter((c) => c.status === 'expiring');
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
  const monthlyRevenue = React.useMemo(
    () => calculateMonthlyRevenueData(invoices, contracts),
    [invoices, contracts]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Quản lý tài sản
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
              Tháng 09/2026
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Bảng Điều Khiển Vận Hành - {propertyName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng quan công suất phòng và dòng tiền thanh toán qua VietQR.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('rooms')}
            id="btn-quick-view-rooms"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xem Sơ Đồ Phòng</span>
          </button>
          <button
            onClick={() => onNavigateTab('utilities')}
            id="btn-quick-record-meter"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Ghi Điện Nước</span>
          </button>
          <button
            onClick={() => onNavigateTab('invoices')}
            id="btn-quick-invoices"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Thu Tiền Phòng</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Công suất phòng */}
        <div
          onClick={() => onNavigateTab('rooms')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tỷ lệ Lấp Đầy</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{occupancyRate}%</span>
            <span className="text-xs text-slate-500">
              ({rentedRooms}/{totalRooms} phòng)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
              {availableRooms} phòng trống
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">{overdueRooms} phòng chậm tiền</span>
          </div>
        </div>

        {/* Card 2: Doanh thu tháng */}
        <div
          onClick={() => onNavigateTab('finance')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Doanh Thu Tháng 9</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {(totalInvoiceAmount / 1000000).toFixed(1)} tr
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +12.4%
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Đã thu:{' '}
            <strong className="text-emerald-700 font-semibold">
              {(totalPaidAmount / 1000000).toFixed(1)} tr
            </strong>
          </div>
        </div>

        {/* Card 3: Công nợ chưa thu */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Công Nợ Chưa Thu</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">
              {(totalDebtAmount / 1000000).toFixed(1)} tr
            </span>
            <span className="text-xs text-rose-500 font-medium">
              ({invoices.filter((i) => i.status !== 'paid').length} hóa đơn)
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Có 1 phòng quá hạn trên 5 ngày</span>
          </div>
        </div>

        {/* Card 4: Sự cố bảo trì */}
        <div
          onClick={() => onNavigateTab('maintenance')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sự Cố Cần Xử Lý</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{urgentTickets.length}</span>
            <span className="text-xs text-amber-600 font-medium">sự cố đang mở</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            1 sự cố khẩn cấp (máy lạnh P.104)
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Urgent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Biểu Đồ Doanh Thu & Lợi Nhuận 6 Tháng Gần Nhất (Triệu VNĐ)
              </h2>
              <p className="text-xs text-slate-400">Doanh thu phòng, chi phí vận hành và dòng tiền ký quỹ Escrow</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">
              Năm 2026
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} Triệu VNĐ`]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Tổng thu" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lợi nhuận ròng" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Urgent Attention Items */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Việc Cần Xử Lý Ngay</span>
              </h2>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {overdueInvoices.length + expiringContracts.length + urgentTickets.length} việc
              </span>
            </div>

            <div className="space-y-3">
              {/* Overdue bill alert */}
              {overdueInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 bg-rose-50/80 border border-rose-200 rounded-lg flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-rose-900">
                        Phòng {inv.roomNumber} chưa đóng tiền
                      </span>
                      <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded">
                        Quá hạn
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 mt-0.5">
                      {inv.tenantName} - {inv.totalAmount.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenInvoiceModal(inv)}
                    className="shrink-0 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold rounded shadow-xs"
                  >
                    Gửi QR
                  </button>
                </div>
              ))}

              {/* Expiring Contract Alert */}
              {expiringContracts.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-900">
                        Phòng {c.roomNumber} sắp hết hợp đồng
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Khách: {c.tenantName} - Hết hạn: {c.endDate}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('contracts')}
                    className="shrink-0 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded shadow-xs"
                  >
                    Gia hạn
                  </button>
                </div>
              ))}

              {/* Urgent Maintenance Ticket */}
              {urgentTickets.slice(0, 1).map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-indigo-900">
                        {t.roomNumber}: {t.title}
                      </span>
                      <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded">
                        Khẩn
                      </span>
                    </div>
                    <p className="text-xs text-indigo-700 mt-0.5 line-clamp-1">{t.description}</p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('maintenance')}
                    className="shrink-0 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded shadow-xs"
                  >
                    Xử lý
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Trạng thái phòng:</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 6 Đang ở
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> 2 Trống
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
