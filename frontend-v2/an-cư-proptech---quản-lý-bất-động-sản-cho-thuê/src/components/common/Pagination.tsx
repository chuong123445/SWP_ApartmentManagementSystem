interface Props { page: number; totalPages: number; onChange: (page: number) => void }
export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages < 2) return null;
  return <nav aria-label="Phân trang" className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 mt-6 text-sm">
    <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} className="app-action-secondary disabled:opacity-45">Trang trước</button>
    <span className="text-slate-600 tabular-nums">Trang {page + 1} / {totalPages}</span>
    <button type="button" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)} className="app-action-secondary disabled:opacity-45">Trang sau</button>
  </nav>;
}
