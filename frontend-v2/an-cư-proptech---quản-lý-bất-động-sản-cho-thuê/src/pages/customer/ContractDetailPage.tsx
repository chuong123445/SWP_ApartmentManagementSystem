import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { ContractReview } from '@/components/contract/ContractReview';
import { getContract } from '@/services/contract/contractService';
import type { ContractDraft } from '@/types/contract';
export function ContractDetailPage() {
  const { id } = useParams();const [draft, setDraft] = useState<ContractDraft | null>(null);const [error, setError] = useState('');
  useEffect(() => { let active = true;setDraft(null);setError('');getContract(id!).then(d => { if (active) setDraft(d); }).catch(e => { if (active) setError(e.message); });return () => { active = false; }; }, [id]);
  return <CustomerLayout><main className="max-w-4xl mx-auto p-4 sm:p-6 py-8 space-y-5"><Link to="/my/contracts" className="text-sm text-emerald-700">← Hợp đồng của tôi</Link><h1 className="text-2xl font-bold">Rà soát hợp đồng</h1>{error ? <p role="alert" className="text-rose-700">{error}</p> : draft ? <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6"><ContractReview snapshot={draft.snapshot} terms={draft} number={draft.contractNumber} status={draft.status} /></section> : <p role="status">Đang tải hợp đồng...</p>}</main></CustomerLayout>;
}
