import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Repeat, FileText, AlertTriangle, Calendar, Clock, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react'
import MetricCard from '../components/common/MetricCard'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import FinanceCopilot from '../components/ai/FinanceCopilot'
import { api } from '../services/api'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'
import { useAuth } from '../context/AuthContext'

export default function StaffDashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(null)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    api.get('/analytics/staff-dashboard')
      .then(setMetrics)
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRequestAction(reqId, action) {
    setActionInProgress(reqId)
    try {
      await api.post(`/customer/requests/${reqId}/action`, { action })
      setFeedbackMsg({ type: 'success', text: `Request #${reqId} ${action}ed successfully.` })
      load()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || `Failed to ${action} request` })
    } finally {
      setActionInProgress(null)
    }
  }

  async function handleQuickRenew(subId) {
    setActionInProgress(`renew-${subId}`)
    try {
      await api.post(`/subscriptions/${subId}/transition`, { action: 'renew' })
      setFeedbackMsg({ type: 'success', text: `Subscription renewed successfully for 1 year.` })
      load()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Renewal failed' })
    } finally {
      setActionInProgress(null)
    }
  }

  if (loading) return <LoadingState label="Loading staff operations dashboard…" />
  if (error && !metrics) return <ErrorState error={error} onRetry={load} />

  const {
    assigned_customers_count = 0,
    active_subscriptions_count = 0,
    pending_quotations_count = 0,
    invoices_needing_attention = [],
    upcoming_renewals = [],
    pending_requests = [],
    recent_operations = [],
  } = metrics || {}

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Operations Center
            </span>
            <span className="text-xs text-slate-400">Assigned Staff: {user?.name || 'Staff Member'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Operational Workspace</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Monitor accounts, process upcoming contract renewals, resolve customer requests, and track pending quotations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/quotations"
            className="text-xs font-medium px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors"
          >
            Create Quotation
          </Link>
          <Link
            to="/customers"
            className="text-xs font-medium px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Manage Accounts
          </Link>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary operational metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="My Accounts"
          value={assigned_customers_count}
          sub="Assigned Customers"
          tone="brand"
        />
        <MetricCard
          label="Active Subscriptions"
          value={active_subscriptions_count}
          sub="Live Contracts"
          tone="emerald"
        />
        <MetricCard
          label="Pending Quotes"
          value={pending_quotations_count}
          sub="Awaiting Approval"
          tone="amber"
        />
        <MetricCard
          label="Invoices To Follow"
          value={invoices_needing_attention.length}
          sub="Overdue / Unpaid"
          tone="red"
        />
        <MetricCard
          label="Upcoming Renewals"
          value={upcoming_renewals.length}
          sub="Next 30 Days"
          tone="brand"
        />
        <MetricCard
          label="Pending Requests"
          value={pending_requests.length}
          sub="Action Needed"
          tone={pending_requests.length > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* Main operational worklists & Copilot */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Pending customer requests */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-semibold text-navy-900">Customer Requests & Inquiries</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
                {pending_requests.length} pending
              </span>
            </div>

            {pending_requests.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-medium text-slate-600">All customer requests resolved</p>
                <p className="text-xs text-slate-400 mt-0.5">No pending pause, renewal, or cancellation requests.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pending_requests.map((req) => (
                  <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-navy-900">{req.customer_name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                          {req.request_type}
                        </span>
                        <span className="text-xs text-slate-400">{req.subscription_number}</span>
                      </div>
                      <p className="text-xs text-slate-600">{req.notes}</p>
                      <p className="text-[11px] text-slate-400">Submitted {formatDate(req.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRequestAction(req.id, 'approve')}
                        disabled={actionInProgress === req.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleRequestAction(req.id, 'reject')}
                        disabled={actionInProgress === req.id}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming contract renewals (Next 30 Days) */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-semibold text-navy-900">Upcoming Renewals (30 Days)</h2>
              </div>
              <Link to="/subscriptions" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                View all subscriptions <ArrowRight size={13} />
              </Link>
            </div>

            {upcoming_renewals.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No subscriptions renewing in the next 30 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Subscription</th>
                      <th className="py-2.5 px-3 font-semibold">Customer</th>
                      <th className="py-2.5 px-3 font-semibold">Expiry Date</th>
                      <th className="py-2.5 px-3 font-semibold">Days Left</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcoming_renewals.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-navy-900">
                          <Link to={`/subscriptions/${r.id}`} className="hover:text-brand-600">
                            {r.subscription_number}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{r.customer_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(r.expiry_date)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.days_left <= 7 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {r.days_left} day{r.days_left === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleQuickRenew(r.id)}
                            disabled={actionInProgress === `renew-${r.id}`}
                            className="px-2.5 py-1 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium text-xs transition-colors"
                          >
                            Extend 1 Year
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Invoices needing attention */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-semibold text-navy-900">Invoices Requiring Follow-Up</h2>
              </div>
              <Link to="/invoices" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                View all invoices <ArrowRight size={13} />
              </Link>
            </div>

            {invoices_needing_attention.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No overdue invoices needing follow-up.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Invoice</th>
                      <th className="py-2.5 px-3 font-semibold">Customer</th>
                      <th className="py-2.5 px-3 font-semibold">Due Date</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Balance</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Record Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices_needing_attention.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-navy-900">{inv.invoice_number}</td>
                        <td className="py-2.5 px-3 text-slate-700">{inv.customer_name}</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">{formatDate(inv.due_date)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-navy-900">
                          {formatINR(inv.balance)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to="/payments"
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                          >
                            Receive
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent operational activity */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <h2 className="text-base font-semibold text-navy-900 mb-3">Recent Operational Activity</h2>
            {recent_operations.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No operations recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent_operations.map((op, i) => (
                  <li key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-navy-900">{op.event_type}</span>
                      <span className="text-slate-400 ml-2">({op.aggregate_type} #{op.aggregate_id})</span>
                    </div>
                    <span className="text-slate-400">{formatDate(op.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Staff AI Copilot */}
        <div className="space-y-6">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-xs text-brand-900">
            <p className="font-semibold flex items-center gap-1.5 mb-1 text-brand-800">
              <Sparkles size={14} /> Staff Operations Copilot
            </p>
            <p className="text-brand-700">
              Ask questions about pending quotes, assigned accounts, renewals, and overdue customer invoices. Answers are queried from live operational records.
            </p>
          </div>
          <FinanceCopilot compact />
        </div>
      </div>
    </div>
  )
}
