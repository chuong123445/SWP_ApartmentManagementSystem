interface Props { page: number; totalPages: number; onChange: (page: number) => void }
export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages < 2) return null;
  return <nav aria-label="Phân trang" className="flex justify-center items-center gap-4 mt-8 text-sm">
    <button disabled={page === 0} onClick={() => onChange(page - 1)} className="border border-slate-300 rounded-lg px-4 py-2 disabled:opacity-40 hover:bg-slate-50">Trang trước</button>
    <span>Trang {page + 1} / {totalPages}</span>
    <button disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)} className="border border-slate-300 rounded-lg px-4 py-2 disabled:opacity-40 hover:bg-slate-50">Trang sau</button>
  </nav>;
}
