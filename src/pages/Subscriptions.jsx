import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import { fetchSubscriptions, createSubscription, fetchPlans } from '../services/subscriptionService'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'

const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }
const EMPTY = { customer_id: '', plan_id: '', quantity: 1, start_date: '', payment_terms: 'net_15' }

export default function Subscriptions() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [plans, setPlans] = useState([])
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  function load() {
    setError(null)
    const params = {}
    if (statusFilter) params.status = statusFilter
    if (customerFilter) params.customer_id = customerFilter
    Promise.all([fetchSubscriptions(params), fetchPlans()])
      .then(([s, p]) => {
        setRows(s)
        setPlans(p)
      })
      .catch(setError)
  }
  useEffect(load, [statusFilter])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const created = await createSubscription({
        customer_id: Number(form.customer_id),
        plan_id: Number(form.plan_id),
        quantity: Number(form.quantity),
        start_date: form.start_date || undefined,
        payment_terms: form.payment_terms,
      })
      setForm(EMPTY)
      setShowForm(false)
      load()
      if (created?.id) navigate(`/subscriptions/${created.id}`)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error && !rows) return <ErrorState error={error} onRetry={load} />
  const planName = (id) => plans.find((p) => p.id === id || p.id === Number(id))?.name

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">All statuses</option>
          {['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Filter by customer…"
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy-800 hover:bg-slate-50">
          Apply
        </button>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="ml-auto px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          {showForm ? 'Close' : '+ New subscription'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Customer ID</label>
            <input
              required
              type="number"
              min="1"
              value={form.customer_id}
              onChange={set('customer_id')}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Plan</label>
            <select
              required
              value={form.plan_id}
              onChange={set('plan_id')}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="">Select…</option>
              {plans
                .filter((p) => p.active !== false)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatINR(p.price)}/{p.billing_interval?.[0] || 'm'}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
            <input
              required
              type="number"
              min="1"
              value={form.quantity}
              onChange={set('quantity')}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Start date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={set('start_date')}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Payment terms</label>
            <select
              value={form.payment_terms}
              onChange={set('payment_terms')}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="immediate">Immediate</option>
              <option value="net_7">Net 7</option>
              <option value="net_15">Net 15</option>
              <option value="net_30">Net 30</option>
            </select>
          </div>
          <div className="md:col-span-5 flex items-center gap-3">
            <button
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create subscription'}
            </button>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
          </div>
        </form>
      )}

      {!rows ? (
        <LoadingState label="Loading subscriptions…" />
      ) : (
        <DataTable
          rows={rows}
          onRowClick={(r) => r.id && navigate(`/subscriptions/${r.id}`)}
          columns={[
            {
              key: 'number',
              header: 'Number',
              render: (r) => <span className="font-medium text-navy-900">{r.number || r.subscription_number || `#${r.id}`}</span>,
            },
            {
              key: 'customer',
              header: 'Customer',
              render: (r) => r.customer_name || (r.customer_id ? `#${r.customer_id}` : '—'),
            },
            { key: 'plan', header: 'Plan', render: (r) => r.plan_name || planName(r.plan_id) || '—' },
            {
              key: 'billing',
              header: 'Frequency',
              render: (r) =>
                FREQ_LABEL[r.billing_interval] || (r.plan?.billing_interval ? FREQ_LABEL[r.plan.billing_interval] : '—'),
            },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              render: (r) => formatINR(r.total ?? r.amount ?? r.plan?.price),
            },
            { key: 'next_billing', header: 'Next billing', render: (r) => formatDate(r.next_billing_date || r.next_billing) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      )}
    </div>
  )
}
