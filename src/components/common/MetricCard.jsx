export default function MetricCard({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200',
    emerald: 'border-emerald-200 bg-emerald-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
    red: 'border-red-200 bg-red-50/50',
    brand: 'border-brand-100 bg-brand-50/50',
  }
  return (
    <div className={`bg-white rounded-xl border ${tones[tone]} shadow-card p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-navy-900">{value ?? '—'}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
