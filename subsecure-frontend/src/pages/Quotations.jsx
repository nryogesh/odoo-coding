import { useEffect, useState } from 'react'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import { fetchQuotations, createQuotation, transitionQuotation, fetchPlans, fetchProducts } from '../services/subscriptionService'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'

const EMPTY = { customer_id: '', plan_id: '', product_id: '', quantity: 1, tax_percent: 18, discount_percent: 0, valid_days: 30 }

export default function Quotations() {
  const [rows, setRows] = useState(null)
  const [plans, setPlans] = useState([])
  const [products, setProducts] = useState([])
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(null)
  const [formError, setFormError] = useState(null)

  function load() {
    setError(null)
    Promise.all([fetchQuotations(), fetchPlans(), fetchProducts()])
      .then(([q, p, pr]) => { setRows(q); setPlans(p); setProducts(pr) })
      .catch(setError)
  }
  useEffect(load, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const selectedPlan = plans.find((p) => p.id === Number(form.plan_id))
  const selectedProduct = products.find((p) => p.id === Number(form.product_id))
  const selectedProductId = Number(form.product_id || selectedPlan?.product_id || 0)
  const unit = Number(selectedPlan?.price ?? selectedProduct?.sales_price ?? 0)
  const subtotal = unit * Number(form.quantity || 1)
  const discount = subtotal * (Number(form.discount_percent || 0) / 100)
  const taxable = subtotal - discount
  const tax = taxable * (Number(form.tax_percent || 0) / 100)
  const total = taxable + tax

  async function submit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving('create')
    try {
      await createQuotation({
        customer_id: Number(form.customer_id),
        plan_id: form.plan_id ? Number(form.plan_id) : undefined,
        lines: [{
          product_id: selectedProductId,
          quantity: Number(form.quantity),
        }],
        tax_percent: Number(form.tax_percent),
        discount_percent: Number(form.discount_percent),
        valid_days: Number(form.valid_days),
      })
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function transition(q, action) {
    setSaving(q.id)
    try {
      await transitionQuotation(q.id, action)
      load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(null)
    }
  }

  if (error && !rows) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((s) => !s)} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
          {showForm ? 'Close' : '+ New quotation'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Customer ID</label>
            <input required type="number" min="1" value={form.customer_id} onChange={set('customer_id')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" placeholder="Customer record id" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Plan (optional)</label>
            <select value={form.plan_id} onChange={set('plan_id')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
              <option value="">—</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatINR(p.price)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Product (optional)</label>
            <select value={form.product_id} onChange={set('product_id')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
              <option value="">—</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatINR(p.sales_price)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
            <input required type="number" min="1" value={form.quantity} onChange={set('quantity')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tax %</label>
            <input type="number" min="0" max="100" step="0.1" value={form.tax_percent} onChange={set('tax_percent')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
            <input type="number" min="0" max="100" step="0.1" value={form.discount_percent} onChange={set('discount_percent')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valid for (days)</label>
            <input type="number" min="1" value={form.valid_days} onChange={set('valid_days')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>

          <div className="md:col-span-3 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm flex flex-wrap gap-x-8 gap-y-1">
            <span>Subtotal <b>{formatINR(subtotal)}</b></span>
            <span>Discount <b>-{formatINR(discount)}</b></span>
            <span>Tax <b>+{formatINR(tax)}</b></span>
            <span className="ml-auto">Total <b className="text-navy-900">{formatINR(total)}</b></span>
          </div>

          <div className="md:col-span-3 flex items-center gap-3">
            <button disabled={!!saving} className="px-5 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 disabled:opacity-50">
              {saving === 'create' ? 'Saving…' : 'Create quotation'}
            </button>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
          </div>
        </form>
      )}

      {!rows ? <LoadingState label="Loading quotations…" /> : (
        <DataTable
          rows={rows}
          columns={[
            { key: 'number', header: 'Number', render: (r) => <span className="font-medium text-navy-900">{r.number || r.quotation_number || `#${r.id}`}</span> },
            { key: 'customer', header: 'Customer', render: (r) => r.customer_name || (r.customer_id ? `#${r.customer_id}` : '—') },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-medium">{formatINR(r.total ?? r.amount)}</span> },
            { key: 'valid_until', header: 'Valid until', render: (r) => formatDate(r.valid_until || r.expiry_date) },
            { key: 'status', header: 'Status', render: (r) => {
              const expired = r.valid_until && new Date(r.valid_until) < new Date() && ['DRAFT', 'QUOTATION'].includes(String(r.status || '').toUpperCase())
              return <StatusBadge status={expired ? 'EXPIRED' : r.status} />
            } },
            { key: 'actions', header: '', render: (r) => {
              const s = String(r.status || '').toUpperCase()
              const allowed = s === 'DRAFT' ? ['send'] : s === 'QUOTATION' ? ['confirm'] : s === 'CONFIRMED' ? ['convert', 'close'] : []
              if (!allowed.length) return <span className="text-xs text-slate-300">—</span>
              return (
                <div className="flex gap-2">
                  {allowed.map((a) => (
                    <button
                      key={a}
                      disabled={saving === r.id}
                      onClick={(e) => { e.stopPropagation(); transition(r, a) }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 text-navy-800 hover:bg-slate-50 disabled:opacity-40 capitalize"
                    >
                      {a === 'convert' ? 'Convert to subscription' : a}
                    </button>
                  ))}
                </div>
              )
            } },
          ]}
        />
      )}
    </div>
  )
}
