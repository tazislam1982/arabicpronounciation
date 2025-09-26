export function Progress({ value, color = "bg-emerald-500" }: { value: number, color?: string }) {
  return (
    <div className="progress-track">
      <div className={`progress-bar ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
