import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MetricCard from '../components/common/MetricCard'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import RevenueChart from '../components/charts/RevenueChart'
import MRRBreakdown from '../components/charts/MRRBreakdown'
import FinanceCopilot from '../components/ai/FinanceCopilot'
import StatusBadge from '../components/common/StatusBadge'
import { fetchDashboard, fetchMRR, fetchChurnRisk, fetchAuditEvents } from '../services/analyticsService'
import { formatINR } from '../utils/currency'
import { formatDateTime } from '../utils/date'

export default function Dashboard() {
  const [dash, setDash] = useState(null)
  const [mrr, setMrr] = useState(null)
  const [risk, setRisk] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.allSettled([fetchDashboard(), fetchMRR(), fetchChurnRisk(), fetchAuditEvents({ limit: 8 })])
      .then(([d, m, r, e]) => {
        if (d.status === 'fulfilled') setDash(d.value)
        else setError(d.reason)
        if (m.status === 'fulfilled') setMrr(m.value)
        if (r.status === 'fulfilled') setRisk(r.value.slice(0, 5))
        if (e.status === 'fulfilled') setEvents(e.value.slice(0, 6))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (loading) return <LoadingState label="Loading dashboard metrics…" />
  if (error && !dash) return <ErrorState error={error} onRetry={load} />

  const k = (obj, ...keys) => { for (const key of keys) if (obj?.[key] !== undefined) return obj[key]; return undefined }
  const metrics = dash || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Active subscriptions" value={k(metrics, 'active_subscriptions', 'activeSubscriptions')} tone="brand" />
        <MetricCard label="MRR" value={formatINR(k(metrics, 'mrr', 'mrr_total'))} sub={<>ARR {formatINR(k(metrics, 'arr', 'arr_total'))}</>} tone="brand" />
        <MetricCard label="Revenue collected" value={formatINR(k(metrics, 'revenue_collected', 'revenue', 'collected_revenue'))} sub="Selected period" tone="emerald" />
        <MetricCard label="Outstanding" value={formatINR(k(metrics, 'outstanding', 'outstanding_amount', 'outstanding_total'))} sub={`${k(metrics, 'overdue_invoices', 'overdue_count') ?? 0} overdue invoices`} tone="amber" />
        <MetricCard label="Overdue invoices" value={k(metrics, 'overdue_invoices', 'overdue_count') ?? 0} tone="red" />
        <MetricCard label="High-risk subscriptions" value={k(metrics, 'high_risk_subscriptions', 'churn_risk_count', 'high_risk_count') ?? risk.length} tone="red" />
        <MetricCard label="New MRR" value={formatINR(k(metrics, 'new_mrr', 'newMRR'))} />
        <MetricCard label="Churned MRR" value={formatINR(k(metrics, 'churned_mrr', 'churnedMRR'))} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RevenueChart data={metrics.revenue_trend || metrics.revenueTrend || metrics.monthly_revenue || []} />
        <MRRBreakdown data={metrics} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy-800">Recent activity</h2>
              <Link to="/audit" className="text-xs text-brand-600 hover:underline">View audit ledger</Link>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No recent events.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {events.map((e, i) => (
                  <li key={e.event_id || i} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-navy-900 font-medium">{e.event_type || e.type || 'Event'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">seq {e.sequence_num ?? '·'} · {String(e.event_hash || '').slice(0, 12)}…</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatDateTime(e.timestamp || e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy-800">Churn risk watchlist</h2>
              <StatusBadge status="HIGH" />
            </div>
            {risk.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No high-risk subscriptions detected.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {risk.map((r, i) => (
                  <li key={r.subscription_id || r.id || i} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-navy-900 font-medium">{r.customer_name || r.subscription_number || `Subscription ${r.subscription_id ?? ''}`}</p>
                      <p className="text-[11px] text-slate-500">{r.reasons?.join?.('; ') || r.reason || 'Risk signals detected'}</p>
                    </div>
                    <span className="text-xs font-semibold text-red-600 shrink-0">score {r.score ?? r.risk_score ?? '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <FinanceCopilot compact />
      </div>
    </div>
  )
}
