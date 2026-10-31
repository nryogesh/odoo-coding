import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Sparkles, Plus, Clock, CheckCircle2, AlertCircle, X, Shield, FileText } from 'lucide-react'
import MetricCard from '../components/common/MetricCard'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import FinanceCopilot from '../components/ai/FinanceCopilot'
import { fetchSubscriptions } from '../services/subscriptionService'
import { fetchInvoices, fetchPayments } from '../services/billingService'
import { api } from '../services/api'
import { formatINR } from '../utils/currency'
import { formatDate, daysUntil } from '../utils/date'
import { useAuth } from '../context/AuthContext'

function InvoicePrintModal({ invoice, onClose }) {
  if (!invoice) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 border border-slate-200 relative my-8 print:m-0 print:p-0 print:border-none print:shadow-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 print:hidden"
        >
          <X size={18} />
        </button>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-600 text-white font-black grid place-items-center text-base">
                S
              </span>
              <div>
                <h2 className="text-lg font-bold text-navy-900 leading-tight">Brightloop Software Pvt Ltd</h2>
                <p className="text-xs text-slate-500">GSTIN: 29AABCB1234F1Z5 · billing@brightloop.io</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-black text-navy-900">TAX INVOICE</h1>
            <p className="text-xs font-mono font-semibold text-brand-600 mt-0.5">{invoice.invoice_number}</p>
            <div className="mt-1">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="grid grid-cols-2 gap-6 text-xs mb-6">
          <div>
            <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Billed To</p>
            <p className="font-bold text-sm text-navy-900 mt-1">{invoice.customer_name || 'Acme Technologies'}</p>
            <p className="text-slate-600">{invoice.customer_email || 'billing@customer.example'}</p>
            <p className="text-slate-500">{invoice.customer_company || ''}</p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <span className="text-slate-400">Issue Date:</span>{' '}
              <span className="font-medium text-navy-900">{formatDate(invoice.issue_date || invoice.created_at)}</span>
            </div>
            <div>
              <span className="text-slate-400">Due Date:</span>{' '}
              <span className="font-medium text-red-600">{formatDate(invoice.due_date)}</span>
            </div>
            {invoice.billing_period_start && (
              <div>
                <span className="text-slate-400">Billing Period:</span>{' '}
                <span className="font-medium">
                  {formatDate(invoice.billing_period_start)} to {formatDate(invoice.billing_period_end)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Tax (18% GST)</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.lines || [
                {
                  id: 1,
                  description: 'Enterprise Subscription Service',
                  quantity: 1,
                  unit_price: invoice.subtotal || invoice.total,
                  tax_amount: invoice.tax_total || 0,
                  line_total: invoice.subtotal || invoice.total,
                },
              ]).map((l, i) => (
                <tr key={i}>
                  <td className="py-2.5 px-3 font-medium text-navy-900">{l.description || l.product_name}</td>
                  <td className="py-2.5 px-3 text-right">{l.quantity || 1}</td>
                  <td className="py-2.5 px-3 text-right">{formatINR(l.unit_price)}</td>
                  <td className="py-2.5 px-3 text-right">{formatINR(l.tax_amount || 0)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{formatINR(l.line_total || l.unit_price * (l.quantity || 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatINR(invoice.subtotal || invoice.total - (invoice.tax_total || 0))}</span>
            </div>
            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied:</span>
                <span>-{formatINR(invoice.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST (18%):</span>
              <span>{formatINR(invoice.tax_total || 0)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-navy-900">
              <span>Total Amount:</span>
              <span className="text-brand-700">{formatINR(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Amount Paid:</span>
              <span>{formatINR(invoice.paid_amount || invoice.amount_paid || 0)}</span>
            </div>
            <div className="border-t border-slate-100 pt-1 flex justify-between font-bold text-xs text-red-600">
              <span>Outstanding Balance:</span>
              <span>{formatINR(invoice.balance !== undefined ? invoice.balance : invoice.total - (invoice.paid_amount || 0))}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between print:hidden">
          <p className="text-[11px] text-slate-400">Generated securely by SubSecure AI Billing Engine</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomerPortal() {
  const { user } = useAuth()
  const [subs, setSubs] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [requests, setRequests] = useState([])
  const [error, setError] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'copilot' | 'requests'

  // Service Request form
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reqForm, setReqForm] = useState({
    subscription_id: '',
    request_type: 'RENEWAL',
    notes: '',
  })
  const [feedback, setFeedback] = useState(null)

  function load() {
    setError(null)
    Promise.allSettled([
      fetchSubscriptions(),
      fetchInvoices(),
      fetchPayments(),
      api.get('/customer/requests'),
    ]).then(([s, i, p, r]) => {
      if (s.status === 'fulfilled') setSubs(s.value)
      else setError(s.reason)
      if (i.status === 'fulfilled') setInvoices(i.value)
      if (p.status === 'fulfilled') setPayments(p.value)
      if (r.status === 'fulfilled') setRequests(r.value || [])
    })
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmitRequest(e) {
    e.preventDefault()
    try {
      await api.post('/customer/requests', reqForm)
      setFeedback({ type: 'success', text: 'Service request submitted successfully. Our operations team has been notified.' })
      setShowRequestForm(false)
      setReqForm({ subscription_id: '', request_type: 'RENEWAL', notes: '' })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit request' })
    }
  }

  if (error && !subs) return <ErrorState error={error} onRetry={load} />
  if (!subs) return <LoadingState label="Loading your account…" />

  const outstanding = invoices.reduce(
    (sum, i) => sum + Number(i.balance ?? Number(i.total ?? 0) - Number(i.paid_amount ?? 0) ?? 0),
    0
  )
  const activeSubs = subs.filter((s) => String(s.status).toUpperCase() === 'ACTIVE')
  const nextRenewal = activeSubs
    .map((s) => s.expiry_date || s.expires_at || s.next_billing_date)
    .filter(Boolean)
    .sort()[0]
  const d = daysUntil(nextRenewal)

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Customer Self-Service Portal
            </span>
            <span className="text-xs text-slate-400">{user?.email}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">{user?.name || 'Customer Account'}</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Access your contracts, view and download tax invoices, submit service requests, or ask the AI Copilot.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'overview' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            My Account
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'copilot' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles size={13} /> AI Copilot
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'requests' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            Requests ({requests.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="My Subscriptions" value={subs.length} tone="brand" />
        <MetricCard label="Active Contracts" value={activeSubs.length} tone="emerald" />
        <MetricCard
          label="Outstanding Balance"
          value={formatINR(outstanding)}
          tone={outstanding > 0 ? 'amber' : 'emerald'}
        />
        <MetricCard
          label="Next Contract Renewal"
          value={formatDate(nextRenewal)}
          sub={d !== null ? (d <= 0 ? 'due now' : `in ${d} day${d === 1 ? '' : 's'}`) : undefined}
        />
      </div>

      {/* Tab: Copilot View */}
      {activeTab === 'copilot' && (
        <div className="space-y-4">
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-xs text-brand-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600 shrink-0" />
              <div>
                <p className="font-bold text-navy-900">Customer Copilot Assistant</p>
                <p className="text-brand-800">
                  Ask questions about your subscriptions, billing dates, pending invoices, or past payments. Responses are strictly isolated to your account.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('overview')}
              className="text-xs text-brand-700 underline font-semibold shrink-0"
            >
              Back to Overview
            </button>
          </div>
          <FinanceCopilot />
        </div>
      )}

      {/* Tab: Service Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-navy-900">Contract & Service Requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">Submit renewal extensions, temporary pauses, or plan changes.</p>
            </div>
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> New Request
            </button>
          </div>

          {showRequestForm && (
            <form onSubmit={handleSubmitRequest} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-navy-900 uppercase">Submit Service Request</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Target Subscription</label>
                  <select
                    required
                    value={reqForm.subscription_id}
                    onChange={(e) => setReqForm({ ...reqForm, subscription_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Subscription…</option>
                    {subs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subscription_number} - {s.plan_name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Request Type</label>
                  <select
                    value={reqForm.request_type}
                    onChange={(e) => setReqForm({ ...reqForm, request_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="RENEWAL">Renewal Extension</option>
                    <option value="PAUSE">Pause Subscription Temporarily</option>
                    <option value="CANCEL">Cancellation Request</option>
                    <option value="SEAT_CHANGE">Seat Quantity Adjustment</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Notes / Instructions for Staff</label>
                  <textarea
                    rows={2}
                    required
                    value={reqForm.notes}
                    onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                    placeholder="e.g. Please extend contract for another 12 months with additional 3 seats"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium"
                >
                  Submit Request
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100">
            {requests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No requests submitted yet.</p>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy-900">{r.request_type}</span>
                      <span className="text-slate-500">{r.subscription_number}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{r.notes}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Submitted on {formatDate(r.created_at)}</p>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <>
          {/* My subscriptions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">My Subscriptions</h2>
              <button
                onClick={() => {
                  setActiveTab('requests')
                  setShowRequestForm(true)
                }}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                + Request Change / Renewal
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {subs.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-navy-900">{s.plan_name || `Plan #${s.plan_id}`}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{s.number || s.subscription_number || `#${s.id}`}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Amount</p>
                      <p className="font-medium text-navy-900">{formatINR(s.total ?? s.amount ?? s.plan?.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Renews / expires</p>
                      <p className="font-medium text-navy-900">
                        {formatDate(s.expiry_date || s.expires_at || s.next_billing_date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {subs.length === 0 && <p className="text-sm text-slate-400">No subscriptions on your account yet.</p>}
            </div>
          </section>

          {/* Invoices and Payments */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Invoices */}
            <section>
              <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide mb-3">My Invoices</h2>
              <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100">
                {invoices.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No invoices yet.</p>}
                {invoices.map((inv) => {
                  const bal = Number(inv.balance ?? Number(inv.total ?? 0) - Number(inv.paid_amount ?? 0))
                  return (
                    <div key={inv.id} className="px-4 py-3.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-medium text-navy-900">{inv.invoice_number || `INV-${inv.id}`}</p>
                        <p className="text-slate-400">due {formatDate(inv.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-navy-900">{formatINR(inv.total)}</p>
                        <p className={`${bal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {bal > 0 ? `${formatINR(bal)} due` : 'settled'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inv.status} />
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-navy-900 transition-colors"
                          title="Print / View Invoice PDF"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Payments */}
            <section>
              <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide mb-3">My Payments</h2>
              <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100">
                {payments.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No payments recorded yet.</p>
                )}
                {payments.map((p) => (
                  <div key={p.id} className="px-4 py-3.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-medium text-navy-900">{formatINR(p.amount)}</p>
                      <p className="text-slate-400 capitalize">
                        {(p.method || '').replace(/_/g, ' ')} · {formatDate(p.payment_date || p.date)}
                      </p>
                    </div>
                    <span className="text-slate-500 font-mono">
                      {p.invoice_number || (p.invoice_id ? `INV-${p.invoice_id}` : '')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {/* Invoice Modal Preview */}
      {selectedInvoice && (
        <InvoicePrintModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  )
}
