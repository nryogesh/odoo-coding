import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function RevenueChart({ data = [] }) {
  const rows = data.map((d) => ({
    label: d.month || d.period || d.label || '',
    revenue: Number(d.revenue ?? d.total ?? d.amount ?? 0),
  }))
  if (!rows.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-8 text-center text-sm text-slate-400">
        No revenue trend data available.
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
      <p className="text-sm font-semibold text-navy-800 mb-3">Revenue trend</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
          <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
          <Line type="monotone" dataKey="revenue" stroke="#7c5cfc" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
