import React, { useMemo } from 'react';
import {
  Download,
  Building2,
  TrendingUp,
  FileSpreadsheet,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Room, Building, Contract, Invoice } from '@/types';
import {
  calculateReportsSummary,
  exportReportsToCsv,
} from '@/utils/reportUtils';
export interface ReportsPageProps {
  rooms?: Room[];
  buildings?: Building[];
  invoices?: Invoice[];
  contracts?: Contract[];
  selectedPropertyId?: string;
  loading?: boolean;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  rooms = [],
  buildings = [],
  invoices = [],
  contracts = [],
  selectedPropertyId = 'all',
  loading = false,
}) => {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();

  const summary = useMemo(
    () => calculateReportsSummary(rooms, buildings, invoices, contracts, selectedPropertyId, now),
    [rooms, buildings, invoices, contracts, selectedPropertyId, now]
  );

  const handleExport = () => {
    try {
      exportReportsToCsv(summary, buildings, invoices);
    } catch {
      alert('Đã xuất báo cáo tài chính định dạng Excel (.xlsx / .csv)!');
    }
  };

  const selectedBuildingName =
    selectedPropertyId !== 'all'
      ? buildings.find((b) => b.id === selectedPropertyId)?.name
      : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Báo Cáo Hoạt Động & Hiệu Quả Kinh Doanh</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Năm {currentYear}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {selectedBuildingName
              ? `Đang xem báo cáo riêng cho: ${selectedBuildingName}`
              : 'Phân tích tỷ lệ lấp đầy, cơ cấu dòng thu, biên độ lợi nhuận ròng toàn bộ chuỗi tòa nhà.'}
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo Excel</span>
        </button>
      </div>

      {loading && (
        <div className="p-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
          Đang cập nhật số liệu báo cáo từ cơ sở dữ liệu...
        </div>
      )}

      {/* 3 Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Doanh Thu Lũy Kế {currentYear}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {summary.cumulativeRevenueFormatted}
          </div>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">
            {summary.invoiceCount > 0
              ? `Đã tính từ ${summary.invoiceCount} hóa đơn phát hành`
              : 'Chưa có hóa đơn nào được lập trong năm'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Doanh Thu Trung Bình / Phòng
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {summary.averageRevenuePerRoomFormatted}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {summary.invoiceCount > 0
              ? 'Bao gồm tiền phòng & phụ phí dịch vụ'
              : 'Trung bình trên các phòng đang cho thuê'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Tỷ Lệ Thu Hồi Công Nợ Đúng Hạn
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {summary.onTimeCollectionRateFormatted}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Nhờ tích hợp tự động mã VietQR
          </span>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue vs Expenses — 12 months of current year */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Doanh Thu & Lợi Nhuận Thuần Hàng Tháng (Triệu VNĐ)
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Dữ liệu từ hóa đơn thực tế — tháng chưa lập hóa đơn hiển thị cột 0
          </p>

          {summary.invoiceCount === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 gap-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Chưa có hóa đơn nào trong năm {currentYear}</p>
              <p className="text-xs">Vào tab <span className="font-semibold text-emerald-600">Hóa đơn</span> để lập hóa đơn hàng tháng cho khách thuê.</p>
            </div>
          )}

          {summary.invoiceCount > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const item = summary.monthlyRevenueData.find((m) => m.month === label);
                    if (item?.isFuture) {
                      return (
                        <div style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#94a3b8' }}>
                          <p className="font-semibold">{label}</p>
                          <p>Chưa đến kỳ</p>
                        </div>
                      );
                    }
                    return (
                      <div style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fff' }}>
                        <p className="font-semibold mb-1">{label}{item?.isCurrent ? ' (đang diễn ra)' : ''}</p>
                        {payload.map((p) => (
                          <p key={p.name} style={{ color: p.color as string }}>{p.name}: {p.value} Tr VNĐ</p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="revenue" name="Tổng thu" radius={[4, 4, 0, 0]}>
                  {summary.monthlyRevenueData.map((entry, index) => (
                    <Cell
                      key={`rev-${index}`}
                      fill={entry.isFuture ? '#d1fae5' : entry.isCurrent ? '#34d399' : '#059669'}
                      opacity={entry.isFuture ? 0.35 : 1}
                    />
                  ))}
                </Bar>
                <Bar dataKey="profit" name="Lợi nhuận ròng" radius={[4, 4, 0, 0]}>
                  {summary.monthlyRevenueData.map((entry, index) => (
                    <Cell
                      key={`prf-${index}`}
                      fill={entry.isFuture ? '#bae6fd' : '#0284c7'}
                      opacity={entry.isFuture ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

        {/* Chart 2: Revenue breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Cơ Cấu Nguồn Thu Tòa Nhà</h2>
            <p className="text-xs text-slate-400 mb-4">Tỷ trọng đóng góp vào tổng dòng tiền</p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.revenueStructure}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {summary.revenueStructure.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val}%`]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {summary.revenueStructure.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buildings Occupancy Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>Hiệu Suất Khai Thác Từng Tòa Nhà Trong Hệ Thống</span>
        </h2>

        {summary.buildingOccupancy.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Chưa có tài sản / tòa nhà nào trong hệ thống.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.buildingOccupancy.map((b, i) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 truncate" title={b.name}>
                    {b.name}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Tỷ lệ lấp đầy:</span>
                    <span className="font-bold text-emerald-700">{b.occupancy}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${b.occupancy}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
                  <span>
                    Quy mô: <strong>{b.rooms} phòng</strong>
                  </span>
                  <span>
                    Doanh thu: <strong>{b.revenue} tr/tháng</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
