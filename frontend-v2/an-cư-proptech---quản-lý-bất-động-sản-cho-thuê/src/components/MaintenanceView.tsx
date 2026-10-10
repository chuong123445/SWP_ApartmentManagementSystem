import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Zap,
  Droplets,
  Wind,
  Layers,
} from 'lucide-react';
import { MaintenanceTicket, Room } from '../types';

interface MaintenanceViewProps {
  tickets: MaintenanceTicket[];
  rooms: Room[];
  onUpdateTicketStatus: (id: string, status: 'pending' | 'in_progress' | 'resolved', cost?: number) => void;
  onAddTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'createdAt'>) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  tickets,
  rooms,
  onUpdateTicketStatus,
  onAddTicket,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [roomNumber, setRoomNumber] = useState('P.104');
  const [tenantName, setTenantName] = useState('Lê Quốc Bảo');
  const [category, setCategory] = useState<'electric' | 'water' | 'aircon' | 'furniture' | 'other'>('aircon');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal'>('urgent');
  const [description, setDescription] = useState('');

  const filteredTickets = tickets.filter((t) => (filter === 'all' ? true : t.status === filter));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTicket({
      title,
      roomNumber,
      tenantName,
      category,
      priority,
      status: 'pending',
      description,
    });
    setIsAddOpen(false);
    setTitle('');
    setDescription('');
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'aircon':
        return <Wind className="w-4 h-4 text-sky-500" />;
      case 'water':
        return <Droplets className="w-4 h-4 text-blue-500" />;
      case 'electric':
        return <Zap className="w-4 h-4 text-amber-500" />;
      default:
        return <Wrench className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Tiếp Nhận Sự Cố & Bảo Trì Thiết Bị</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full">
              {tickets.filter((t) => t.status !== 'resolved').length} sự cố đang mở
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý yêu cầu sửa chữa từ khách thuê, phân công thợ và nghiệm thu chi phí.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          id="btn-add-ticket"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Báo Sự Cố Mới</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {[
          { id: 'all', label: `Tất cả (${tickets.length})` },
          { id: 'pending', label: `Chờ xử lý (${tickets.filter((t) => t.status === 'pending').length})` },
          { id: 'in_progress', label: `Đang sửa (${tickets.filter((t) => t.status === 'in_progress').length})` },
          { id: 'resolved', label: `Đã xong (${tickets.filter((t) => t.status === 'resolved').length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === t.id
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTickets.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all"
          >
            <div>
              {/* Header: priority & category */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  {getCategoryIcon(t.category)}
                  <span className="font-bold text-xs text-slate-800">{t.roomNumber}</span>
                  <span className="text-[11px] text-slate-400">({t.tenantName})</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.priority === 'urgent'
                      ? 'bg-rose-100 text-rose-800'
                      : t.priority === 'high'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {t.priority === 'urgent' ? 'Khẩn cấp' : t.priority === 'high' ? 'Ưu tiên cao' : 'Bình thường'}
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-3">
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{t.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t.description}</p>
              </div>

              {/* Meta */}
              <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                <div>Thời gian báo: {t.createdAt}</div>
                {t.cost && (
                  <div className="text-emerald-700 font-semibold">
                    Chi phí sửa: {t.cost.toLocaleString('vi-VN')} đ
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  t.status === 'resolved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : t.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {t.status === 'resolved'
                  ? 'Đã sửa xong'
                  : t.status === 'in_progress'
                  ? 'Đang cử thợ sửa'
                  : 'Chờ duyệt'}
              </span>

              <div className="flex items-center gap-1.5">
                {t.status !== 'resolved' && (
                  <button
                    onClick={() => {
                      const costInput = prompt('Nhập chi phí sửa chữa nghiệm thu (VNĐ):', '350000');
                      const cost = costInput ? Number(costInput) : 0;
                      onUpdateTicketStatus(t.id, 'resolved', cost);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition-colors"
                  >
                    Nghiệm thu
                  </button>
                )}
                {t.status === 'pending' && (
                  <button
                    onClick={() => onUpdateTicketStatus(t.id, 'in_progress')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded text-[11px] transition-colors"
                  >
                    Gán thợ
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
              Ghi Nhận Sự Cố / Phản Ánh
            </h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tiêu đề sự cố *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Hỏng vòi nước, chập điện..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phòng báo</label>
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.roomNumber}>
                        {r.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại sự cố</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  >
                    <option value="aircon">Máy lạnh / Làm mát</option>
                    <option value="water">Đường ống nước / Vòi</option>
                    <option value="electric">Điện / Bóng đèn</option>
                    <option value="furniture">Nội thất / Giường tủ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mức độ ưu tiên</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                >
                  <option value="urgent">Khẩn cấp (Xử lý trong 2h)</option>
                  <option value="high">Ưu tiên cao (Trong ngày)</option>
                  <option value="normal">Bình thường (1-2 ngày)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả cụ thể hiện trạng sự cố..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Lưu Sự Cố
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
