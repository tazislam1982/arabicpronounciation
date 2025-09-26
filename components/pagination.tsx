/* ---------------------------- UI: Pagination ---------------------------- */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const goto = (p: number) => onPageChange(Math.min(Math.max(p, 1), totalPages));
  const around: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  for (let i = from; i <= to; i++) around.push(i);

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => goto(1)}
        disabled={page === 1}
        className="px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
      >
        « First
      </button>
      <button
        onClick={() => goto(page - 1)}
        disabled={page === 1}
        className="px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
      >
        ‹ Prev
      </button>

      {around[0] > 1 && <span className="px-1">…</span>}
      {around.map((n) => (
        <button
          key={n}
          onClick={() => goto(n)}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            n === page
              ? "bg-sky-600 text-white border-sky-600"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          {n}
        </button>
      ))}
      {around[around.length - 1] < totalPages && <span className="px-1">…</span>}

      <button
        onClick={() => goto(page + 1)}
        disabled={page === totalPages}
        className="px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
      >
        Next ›
      </button>
      <button
        onClick={() => goto(totalPages)}
        disabled={page === totalPages}
        className="px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
      >
        Last »
      </button>
    </div>
  );
}