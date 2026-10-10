import React from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  Building2,
  Calendar,
  Percent,
  DollarSign,
  Download,
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
import { monthlyRevenueData } from '../mockData';

export const ReportsView: React.FC = () => {
  const revenueStructure = [
    { name: 'Tiền thuê phòng', value: 82, color: '#059669' },
    { name: 'Tiền điện', value: 10, color: '#f59e0b' },
    { name: 'Tiền nước', value: 5, color: '#0284c7' },
    { name: 'Internet & Vệ sinh', value: 3, color: '#8b5cf6' },
  ];

  const buildingOccupancy = [
    { name: 'Tòa A - Lê Văn Sỹ (Q.3)', occupancy: 85, rooms: 24, revenue: 115 },
    { name: 'Tòa B - Điện Biên Phủ (Bình Thạnh)', occupancy: 92, rooms: 16, revenue: 84 },
    { name: 'Tòa C - Cầu Giấy (HN)', occupancy: 78, rooms: 18, revenue: 76 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Báo Cáo Hoạt Động & Hiệu Quả Kinh Doanh</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Năm 2026
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Phân tích tỷ lệ lấp đầy, cơ cấu dòng thu, biên độ lợi nhuận ròng toàn bộ chuỗi tòa nhà.
          </p>
        </div>

        <button
          onClick={() => alert('Đã xuất báo cáo tài chính định dạng Excel (.xlsx)!')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo Excel</span>
        </button>
      </div>

      {/* 3 Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Doanh Thu Lũy Kế 9 Tháng 2026</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">428.5 Triệu VNĐ</div>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">
            ↑ Đạt 82% chỉ tiêu kế hoạch năm
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Doanh Thu Trung Bình / Phòng</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">5.280.000 đ</div>
          <span className="text-xs text-slate-400 mt-1 block">Bao gồm tiền phòng & phụ phí dịch vụ</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Tỷ Lệ Thu Hồi Công Nợ Đúng Hạn</span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">94.2%</div>
          <span className="text-xs text-slate-400 mt-1 block">Nhờ tích hợp tự động mã VietQR</span>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue vs Expenses 6 months */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Doanh Thu & Lợi Nhuận Thuần Hàng Tháng (Triệu VNĐ)
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            So sánh doanh thu thực tế và chi phí quản lý vận hành
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} Tr VNĐ`]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="revenue" name="Tổng thu" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lợi nhuận ròng" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                    data={revenueStructure}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueStructure.map((entry, index) => (
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
            {revenueStructure.map((item, idx) => (
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
        <h2 className="text-sm font-bold text-slate-900 mb-4">
          Hiệu Suất Khai Thác Từng Tòa Nhà Trong Hệ Thống
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buildingOccupancy.map((b, i) => (
            <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{b.name}</span>
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
                <span>Quy mô: <strong>{b.rooms} phòng</strong></span>
                <span>Doanh thu: <strong>{b.revenue} tr/tháng</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
