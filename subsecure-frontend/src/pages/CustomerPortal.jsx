import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MetricCard from '../components/common/MetricCard'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import { fetchSubscriptions } from '../services/subscriptionService'
import { fetchInvoices, fetchPayments } from '../services/billingService'
import { formatINR } from '../utils/currency'
import { formatDate, daysUntil } from '../utils/date'

export default function CustomerPortal() {
  const [subs, setSubs] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [error, setError] = useState(null)

  function load() {
    setError(null)
    Promise.allSettled([fetchSubscriptions(), fetchInvoices(), fetchPayments()])
      .then(([s, i, p]) => {
        if (s.status === 'fulfilled') setSubs(s.value)
        else setError(s.reason)
        if (i.status === 'fulfilled') setInvoices(i.value)
        if (p.status === 'fulfilled') setPayments(p.value)
      })
  }
  useEffect(load, [])

  if (error && !subs) return <ErrorState error={error} onRetry={load} />
  if (!subs) return <LoadingState label="Loading your account…" />

  const outstanding = invoices.reduce((sum, i) => sum + Number(i.balance ?? (Number(i.total ?? 0) - Number(i.paid_amount ?? 0)) ?? 0), 0)
  const activeSubs = subs.filter((s) => String(s.status).toUpperCase() === 'ACTIVE')
  const nextRenewal = activeSubs
    .map((s) => s.expiry_date || s.expires_at || s.next_billing_date)
    .filter(Boolean).sort()[0]
  const d = daysUntil(nextRenewal)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="My subscriptions" value={subs.length} tone="brand" />
        <MetricCard label="Active" value={activeSubs.length} tone="emerald" />
        <MetricCard label="Outstanding balance" value={formatINR(outstanding)} tone={outstanding > 0 ? 'amber' : 'emerald'} />
        <MetricCard
          label="Next renewal"
          value={formatDate(nextRenewal)}
          sub={d !== null ? (d <= 0 ? 'due now' : `in ${d} day${d === 1 ? '' : 's'}`) : undefined}
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide mb-3">My subscriptions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {subs.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-navy-900">{s.plan_name || `Plan #${s.plan_id}`}</p>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{s.number || s.subscription_number || `#${s.id}`}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">Amount</p><p className="font-medium">{formatINR(s.total ?? s.amount ?? s.plan?.price)}</p></div>
                <div><p className="text-xs text-slate-400">Renews / expires</p><p className="font-medium">{formatDate(s.expiry_date || s.expires_at || s.next_billing_date)}</p></div>
              </div>
            </div>
          ))}
          {subs.length === 0 && <p className="text-sm text-slate-400">No subscriptions on your account yet.</p>}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide mb-3">My invoices</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100">
            {invoices.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No invoices yet.</p>}
            {invoices.map((inv) => {
              const bal = Number(inv.balance ?? (Number(inv.total ?? 0) - Number(inv.paid_amount ?? 0)))
              return (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-navy-900">{inv.invoice_number || `INV-${inv.id}`}</p>
                    <p className="text-[11px] text-slate-400">due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatINR(inv.total)}</p>
                    <p className={`text-[11px] ${bal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {bal > 0 ? `${formatINR(bal)} outstanding` : 'settled'}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide mb-3">My payments</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100">
            {payments.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No payments recorded yet.</p>}
            {payments.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-navy-900">{formatINR(p.amount)}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{(p.method || '').replace(/_/g, ' ')} · {formatDate(p.payment_date || p.date)}</p>
                </div>
                <span className="text-xs text-slate-500">{p.invoice_number || (p.invoice_id ? `INV-${p.invoice_id}` : '')}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Questions about your account? <Link to="/ai-copilot" className="text-brand-600 hover:underline">Ask the AI assistant</Link> — it only sees your own records.
          </p>
        </section>
      </div>
    </div>
  )
}
