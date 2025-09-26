export function PriceCard({
  badge,
  label,
  title,
  price,
  oldPrice,
  payNote,
  cta,
  highlight,
  subtle,
}: {
  badge: string;
  label: string;
  title: string;
  price: string;
  oldPrice?: string;
  payNote?: string;
  cta: string;
  highlight?: boolean;
  subtle?: boolean;
}) {
  return (
    <div
      className={[
        "relative group rounded-2xl bg-white text-slate-800",
        "border border-slate-200/80 shadow-lg transition-all",
        "hover:-translate-y-1 hover:shadow-2xl",
        "min-h-[350px] p-6",           // <- min height
        highlight ? "ring-4 ring-amber-300/70" : "",
      ].join(" ")}
    >
      {/* Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span
          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
            highlight ? "bg-amber-400 text-slate-900" : "bg-custom-orange text-white"
          }`}
        >
          {badge}
        </span>
      </div>

      {/* Centered content */}
      <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <div className="text-[11px] tracking-widest text-slate-500">{label}</div>
        <h3 className="text-2xl font-semibold">{title}</h3>

        <div className="text-3xl font-extrabold">{price}</div>

        {(oldPrice || payNote) && (
          <div className="text-xs text-slate-500">
            {oldPrice && (
              <span className={subtle ? "opacity-60" : ""}>
                <s>{oldPrice}</s>
              </span>
            )}
            {payNote && (
              <span className="ml-2 font-semibold text-slate-700">{payNote}</span>
            )}
          </div>
        )}

        <button
          className={`mt-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm ${
            highlight
              ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
              : "rounded-full btn-base px-5 py-2 font-medium hover:btn-base"
          }`}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
