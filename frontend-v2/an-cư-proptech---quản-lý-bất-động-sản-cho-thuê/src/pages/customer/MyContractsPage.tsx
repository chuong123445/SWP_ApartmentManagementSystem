import { CustomerLayout } from '@/layouts/CustomerLayout';
import { ContractDraftList } from '@/components/contract/ContractDraftList';
export function MyContractsPage() {
  return <CustomerLayout><main className="max-w-5xl mx-auto p-5 py-8 space-y-6"><h1 className="text-2xl font-bold">Hợp đồng của tôi</h1><p className="text-sm text-slate-500">Rà soát thông tin hai bên, căn hộ và điều khoản do chủ nhà soạn.</p><ContractDraftList /></main></CustomerLayout>;
}
