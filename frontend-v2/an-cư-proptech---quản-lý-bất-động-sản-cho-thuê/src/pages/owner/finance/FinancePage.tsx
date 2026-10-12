import React, { useState } from 'react';
import { Wallet, Plus, ArrowDownRight, ArrowUpRight, Filter, Search } from 'lucide-react';
import { Transaction } from '@/types';

interface FinancePageProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'code'>) => void;
}

export const FinancePage: React.FC<FinancePageProps> = ({
  transactions,
  onAddTransaction,
}) => {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Sửa chữa & Bảo trì');
  const [amount, setAmount] = useState('500000');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Chuyển khoản');

  const filtered = transactions.filter((t) => (filter === 'all' ? true : t.type === filter));

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTransaction({
      date: new Date().toLocaleDateString('vi-VN'),
      type,
      category,
      amount: Number(amount) || 0,
      description,
      paymentMethod,
    });
    setIsAddOpen(false);
    setDescription('');
    setAmount('500000');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Sổ Quỹ Thu - Chi & Dòng Tiền Thực Tế</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Tháng 09/2026
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận thực tế các dòng tiền mặt và chuyển khoản ngân hàng ra vào tòa nhà.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          id="btn-add-transaction"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Phiếu Thu / Chi</span>
        </button>
      </div>

      {/* Summary 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Tổng Thực Thu (Vào)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-2">
            +{totalIncome.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Tiền phòng, cọc và phụ phí</span>
        </div>

        {/* Total Expense */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
            <span>Tổng Thực Chi (Ra)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700 mt-2">
            -{totalExpense.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">Điện EVN, nước Sawaco, thợ sửa</span>
        </div>

        {/* Net Cashflow */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Dòng Tiền Ròng (Lãi)</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {netProfit.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Tỷ suất lợi nhuận ròng ~72%</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {[
          { id: 'all', label: `Tất cả giao dịch (${transactions.length})` },
          {
            id: 'income',
            label: `Khoản thu (${transactions.filter((t) => t.type === 'income').length})`,
          },
          {
            id: 'expense',
            label: `Khoản chi (${transactions.filter((t) => t.type === 'expense').length})`,
          },
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

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã Phiếu</th>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Danh Mục</th>
                <th className="px-4 py-3">Mô Tả Chi Tiết</th>
                <th className="px-4 py-3">Phương Thức</th>
                <th className="px-4 py-3 text-right">Số Tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{t.code}</td>
                  <td className="px-4 py-3 text-slate-600">{t.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.category}</td>
                  <td className="px-4 py-3 text-slate-600">{t.description}</td>
                  <td className="px-4 py-3 text-slate-600">{t.paymentMethod}</td>
                  <td
                    className={`px-4 py-3 text-right font-bold text-sm ${
                      t.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {t.amount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
              Lập Phiếu Thu / Chi Thực Tế
            </h3>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Loại phiếu *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Phiếu Thu (Tiền vào)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Phiếu Chi (Tiền ra)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Danh mục thu/chi *</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="VD: Điện EVN, Bảo dưỡng máy giặt..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số tiền (VNĐ) *</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hình thức thanh toán</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                >
                  <option value="Chuyển khoản">Chuyển khoản / VietQR</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mô tả / Ghi chú</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ghi chú chi tiết hóa đơn, người nhận..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
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
                  Lưu Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
