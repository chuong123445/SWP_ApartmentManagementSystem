import { FileCheck2, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Contract } from '@/types';
import { ContractDraftList } from '@/components/contract/ContractDraftList';

interface ContractsPageProps { propertyId?: string; onChooseRequest?: () => void; contracts: Contract[] }

export function ContractsPage({ contracts, propertyId, onChooseRequest }: ContractsPageProps) {
  const [search, setSearch] = useState('');
  const needle = search.trim().toLocaleLowerCase('vi');
  const existing = contracts.filter(contract => contract.status !== 'draft' &&
    `${contract.contractNumber} ${contract.tenantName} ${contract.roomNumber}`.toLocaleLowerCase('vi').includes(needle));
  return <div className="space-y-6 pb-12">
    <header className="flex flex-wrap justify-between items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5">
      <div><h1 className="text-xl font-bold flex items-center gap-2"><FileCheck2 className="text-emerald-700" />Hợp đồng thuê</h1>
        <p className="text-sm text-slate-500 mt-2">Tạo hợp đồng từ yêu cầu đã chấp nhận, xem PDF và ký xác nhận bằng tài khoản của mỗi bên.</p>
        <p className="text-xs text-slate-500 mt-2">{contracts.length} hợp đồng trong tài sản đang chọn. Bản có chữ ký được khóa nội dung.</p>
      </div>
      <button type="button" id="btn-add-contract" onClick={onChooseRequest} disabled={!onChooseRequest}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 text-white px-4 py-3 font-semibold text-sm disabled:opacity-50">
        <Plus size={17} />Tạo hợp đồng mới
      </button>
    </header>
    <ContractDraftList owner propertyId={propertyId} />
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 space-y-3"><h2 className="font-bold">Quan hệ thuê đã lưu</h2>
        <label className="block text-sm text-slate-600">Tìm số hợp đồng, khách thuê hoặc phòng
          <input value={search} onChange={event => setSearch(event.target.value)} className="block w-full mt-2 border border-slate-300 rounded-lg p-3" placeholder="Nhập thông tin cần tìm..." />
        </label>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600"><tr>
        {['Số hợp đồng', 'Phòng / căn', 'Khách thuê', 'Thời hạn', 'Tiền thuê / tháng', 'Trạng thái'].map(label => <th key={label} className="p-3 font-semibold">{label}</th>)}
      </tr></thead><tbody>{existing.map(contract => <tr key={contract.id} className="border-t border-slate-100">
        <td className="p-3 font-medium">{contract.contractNumber}</td><td className="p-3">{contract.roomNumber}</td><td className="p-3">{contract.tenantName}</td>
        <td className="p-3">{contract.startDate} → {contract.endDate}</td><td className="p-3">{contract.monthlyRent.toLocaleString('vi-VN')} đ</td>
        <td className="p-3">{contract.status === 'expiring' ? 'Sắp hết hạn' : contract.status === 'active' ? 'Đang hiệu lực' : 'Đã kết thúc'}</td>
      </tr>)}{!existing.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Chưa có quan hệ thuê phù hợp.</td></tr>}</tbody></table></div>
    </section>
    <p className="text-xs text-slate-500">Các quan hệ thuê cũ chưa có bản nội dung gốc không được tự tạo PDF hoặc gắn chữ ký giả. Hợp đồng mới được lưu đầy đủ thông tin, điều khoản và chữ ký tại đây.</p>
  </div>;
}
