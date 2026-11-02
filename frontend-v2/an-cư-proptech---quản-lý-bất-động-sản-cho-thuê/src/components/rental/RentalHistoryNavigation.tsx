export type RentalHistoryTab = 'requests' | 'contracts';

export function RentalHistoryNavigation({ active, onChange }: { active: RentalHistoryTab; onChange: (tab: RentalHistoryTab) => void }) {
  return <div role="tablist" aria-label="Yêu cầu thuê và hợp đồng" className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
    {(['requests', 'contracts'] as const).map(tab => <button key={tab} type="button" role="tab" id={`rental-tab-${tab}`} aria-selected={active === tab} aria-controls={`rental-panel-${tab}`} tabIndex={active === tab ? 0 : -1}
      onClick={() => onChange(tab)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 'requests' : event.key === 'End' ? 'contracts' : tab === 'requests' ? 'contracts' : 'requests';
        onChange(next); document.getElementById(`rental-tab-${next}`)?.focus();
      }} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${active === tab ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-slate-300 text-slate-700'}`}>{tab === 'requests' ? 'Yêu cầu thuê đã gửi' : 'Hợp đồng'}</button>)}
  </div>;
}
