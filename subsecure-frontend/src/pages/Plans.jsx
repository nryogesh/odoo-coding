import { useEffect, useState } from 'react'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import { fetchPlans, createPlan, fetchProducts } from '../services/subscriptionService'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'

const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }
const EMPTY = {
  name: '', product_id: '', price: '', billing_interval: 'monthly', min_quantity: 1,
  available_from: '', available_until: '', auto_close: false, allow_pause: true,
  allow_early_close: false, allow_renewal: true, active: true,
}

export default function Plans() {
  const [plans, setPlans] = useState(null)
  const [products, setProducts] = useState([])
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  function load() {
    setError(null)
    Promise.all([fetchPlans(), fetchProducts()])
      .then(([p, pr]) => { setPlans(p); setProducts(pr) })
      .catch(setError)
  }
  useEffect(load, [])

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      await createPlan({
        ...form,
        product_id: Number(form.product_id),
        price: Number(form.price),
        min_quantity: Number(form.min_quantity || 1),
        available_from: form.available_from || null,
        available_until: form.available_until || null,
      })
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorState error={error} onRetry={load} />
  const productName = (id) => products.find((p) => p.id === id || p.id === Number(id))?.name || `#${id}`

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((s) => !s)} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
          {showForm ? 'Close' : '+ New plan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Plan name</label>
            <input required value={form.name} onChange={set('name')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" placeholder="Enterprise Monthly" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
            <select required value={form.product_id} onChange={set('product_id')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Price (₹)</label>
            <input required type="number" min="0" step="0.01" value={form.price} onChange={set('price')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Billing frequency</label>
            <select value={form.billing_interval} onChange={set('billing_interval')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
              {Object.entries(FREQ_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Minimum quantity</label>
            <input type="number" min="1" value={form.min_quantity} onChange={set('min_quantity')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Available from</label>
              <input type="date" value={form.available_from} onChange={set('available_from')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Available until</label>
              <input type="date" value={form.available_until} onChange={set('available_until')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-x-6 gap-y-2">
            {[
              ['auto_close', 'Auto-close at expiry'],
              ['allow_pause', 'Allow pause'],
              ['allow_early_close', 'Allow early close'],
              ['allow_renewal', 'Allow renewal'],
              ['active', 'Active'],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form[k]} onChange={set(k)} className="rounded" /> {label}
              </label>
            ))}
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            <button disabled={saving} className="px-5 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save plan'}
            </button>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
          </div>
        </form>
      )}

      {!plans ? <LoadingState label="Loading plans…" /> : (
        <DataTable
          rows={plans}
          columns={[
            { key: 'name', header: 'Plan', render: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
            { key: 'product', header: 'Product', render: (r) => r.product_name || productName(r.product_id) },
            { key: 'price', header: 'Price', align: 'right', render: (r) => <span className="font-medium">{formatINR(r.price)}</span> },
            { key: 'billing_interval', header: 'Frequency', render: (r) => FREQ_LABEL[r.billing_interval] || r.billing_interval || '—' },
            { key: 'min_quantity', header: 'Min qty', align: 'right' },
            { key: 'available_from', header: 'Available', render: (r) => <span className="text-xs">{formatDate(r.available_from)} → {formatDate(r.available_until)}</span> },
            { key: 'flags', header: 'Rules', render: (r) => (
              <span className="text-xs text-slate-500">
                {[r.auto_close && 'auto-close', r.allow_pause && 'pausable', r.allow_early_close && 'early-close', r.allow_renewal && 'renewable'].filter(Boolean).join(' · ') || '—'}
              </span>
            ) },
            { key: 'active', header: 'Status', render: (r) => <StatusBadge status={r.active ? 'ACTIVE' : 'CLOSED'} /> },
          ]}
        />
      )}
    </div>
  )
}
