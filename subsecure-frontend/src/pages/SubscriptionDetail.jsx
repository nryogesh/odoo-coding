import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import AuditTimeline from '../components/audit/AuditTimeline'
import { fetchSubscription, transitionSubscription, fetchSubscriptionEvents, subscriptionStateAt } from '../services/subscriptionService'
import { formatINR } from '../utils/currency'
import { formatDate, formatDateTime } from '../utils/date'

const ACTIONS_BY_STATUS = {
  DRAFT: ['confirm'],
  QUOTATION: ['confirm'],
  CONFIRMED: ['activate'],
  ACTIVE: ['pause', 'renew', 'close'],
  PAUSED: ['resume', 'close'],
  CLOSED: [],
  EXPIRED: [],
}

export default function SubscriptionDetail() {
  const { id } = useParams()
  const [sub, setSub] = useState(null)
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [stateAt, setStateAt] = useState('')
  const [stateAtResult, setStateAtResult] = useState(null)

  function load() {
    setError(null)
    fetchSubscription(id).then(setSub).catch(setError)
    fetchSubscriptionEvents(id).then(setEvents).catch(() => setEvents([]))
  }
  useEffect(load, [id])

  async function transition(action) {
    setBusy(action)
    try {
      await transitionSubscription(id, action)
      setStateAtResult(null)
      load()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  async function replay() {
    if (!stateAt) return
    setBusy('state-at')
    try {
      setStateAtResult(await subscriptionStateAt(id, new Date(stateAt).toISOString()))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  if (error && !sub) return <ErrorState error={error} onRetry={load} />
  if (!sub) return <LoadingState label="Loading subscription…" />

  const actions = ACTIONS_BY_STATUS[String(sub.status || '').toUpperCase()] || []
  const lines = sub.lines || sub.subscription_lines || []

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-4 py-2.5">{error.message}</div>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-navy-900">{sub.number || sub.subscription_number || `Subscription #${sub.id}`}</h2>
              <StatusBadge status={sub.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {sub.customer_name || (sub.customer_id ? `Customer #${sub.customer_id}` : '')} · {sub.plan_name || `Plan #${sub.plan_id}`}
            </p>
          </div>
          <div className="flex gap-2">
            {actions.map((a) => (
              <button
                key={a}
                disabled={!!busy}
                onClick={() => transition(a)}
                className="px-4 py-2 rounded-lg text-sm font-medium capitalize bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
              >
                {busy === a ? 'Working…' : a}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-slate-400 uppercase tracking-wide">Start</p><p className="font-medium mt-0.5">{formatDate(sub.start_date)}</p></div>
          <div><p className="text-xs text-slate-400 uppercase tracking-wide">Expiry</p><p className="font-medium mt-0.5">{formatDate(sub.expiry_date || sub.expires_at)}</p></div>
          <div><p className="text-xs text-slate-400 uppercase tracking-wide">Payment terms</p><p className="font-medium mt-0.5 capitalize">{String(sub.payment_terms || '—').replace(/_/g, ' ')}</p></div>
          <div><p className="text-xs text-slate-400 uppercase tracking-wide">Total</p><p className="font-semibold mt-0.5">{formatINR(sub.total ?? sub.amount)}</p></div>
        </div>

        {lines.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lines</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-1.5 font-medium">Product</th>
                  <th className="py-1.5 font-medium text-right">Qty</th>
                  <th className="py-1.5 font-medium text-right">Unit price</th>
                  <th className="py-1.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id ?? i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2">{l.product_name || l.name || `Line ${i + 1}`}</td>
                    <td className="py-2 text-right">{l.quantity ?? l.qty}</td>
                    <td className="py-2 text-right">{formatINR(l.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{formatINR(l.amount ?? l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-navy-800 mb-4">Event timeline</h3>
          {events === null ? <LoadingState label="Loading events…" /> : <AuditTimeline events={events} />}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-navy-800 mb-1">Time travel — state at timestamp</h3>
          <p className="text-xs text-slate-500 mb-3">Replay this subscription's events up to a point in time.</p>
          <div className="flex gap-2">
            <input type="datetime-local" value={stateAt} onChange={(e) => setStateAt(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            <button onClick={replay} disabled={!stateAt || busy === 'state-at'} className="px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 disabled:opacity-40">
              {busy === 'state-at' ? 'Replaying…' : 'Replay'}
            </button>
          </div>
          {stateAtResult && (
            <pre className="mt-4 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-64">
              {JSON.stringify(stateAtResult, null, 2)}
            </pre>
          )}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <Link to="/invoices" className="text-xs text-brand-600 hover:underline">View invoices for this subscription →</Link>
          </div>
        </div>
      </div>

      {sub.updated_at && <p className="text-[11px] text-slate-400">Last updated {formatDateTime(sub.updated_at)}</p>}
    </div>
  )
}
