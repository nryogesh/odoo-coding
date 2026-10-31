import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'

export default function MRRBreakdown({ data }) {
  const rows = Array.isArray(data)
    ? data.map((d) => ({
        name: d.month || d.period || '',
        New: Number(d.new ?? d.new_mrr ?? 0),
        Expansion: Number(d.expansion ?? d.expansion_mrr ?? 0),
        Churned: Number(d.churned ?? d.churned_mrr ?? 0),
      }))
    : [
        {
          name: 'This month',
          New: Number(data?.new_mrr ?? data?.new ?? 0),
          Expansion: Number(data?.expansion_mrr ?? data?.expansion ?? 0),
          Churned: Number(Math.abs(data?.churned_mrr ?? data?.churned ?? 0)),
        },
      ]

  const isEmpty = rows.every((r) => !r.New && !r.Expansion && !r.Churned)
  if (isEmpty) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-8 text-center text-sm text-slate-400">
        No MRR movement data available.
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
      <p className="text-sm font-semibold text-navy-800 mb-3">MRR breakdown — New / Expansion / Churned</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
          <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
          <Legend />
          <Bar dataKey="New" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expansion" fill="#7c5cfc" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Churned" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
