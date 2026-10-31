const TONES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  CLOSED: 'bg-slate-100 text-slate-500 border-slate-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  QUOTATION: 'bg-brand-50 text-brand-700 border-brand-100',
  ADMIN: 'bg-brand-50 text-brand-700 border-brand-100',
  STAFF: 'bg-sky-50 text-sky-700 border-sky-200',
  CUSTOMER: 'bg-slate-100 text-slate-600 border-slate-200',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null
  const s = String(status).toUpperCase()
  const tone = TONES[s] || 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${tone} ${className}`}>
      {s}
    </span>
  )
}
