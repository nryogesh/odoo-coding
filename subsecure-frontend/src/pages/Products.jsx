import { useEffect, useState } from 'react'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import { fetchProducts, createProduct } from '../services/subscriptionService'
import { formatINR } from '../utils/currency'

const EMPTY = { name: '', type: 'service', sales_price: '', cost_price: '', notes: '', active: true, variants: [] }

export default function Products() {
  const [products, setProducts] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  function load() {
    setError(null)
    fetchProducts().then(setProducts).catch(setError)
  }
  useEffect(load, [])

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { name: '', price_adjustment: '' }] }))
  }
  function setVariant(i, k, v) {
    setForm((f) => {
      const variants = [...f.variants]
      variants[i] = { ...variants[i], [k]: v }
      return { ...f, variants }
    })
  }

  async function submit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      await createProduct({
        ...form,
        sales_price: Number(form.sales_price),
        cost_price: form.cost_price === '' ? null : Number(form.cost_price),
        variants: form.variants
          .filter((v) => v.name.trim())
          .map((v) => ({ ...v, price_adjustment: Number(v.price_adjustment || 0) })),
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

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          {showForm ? 'Close' : '+ New product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input required value={form.name} onChange={set('name')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" placeholder="Brightloop CRM" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={form.type} onChange={set('type')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
              <option value="service">Service</option>
              <option value="software">Software</option>
              <option value="addon">Add-on</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sales price (₹)</label>
            <input required type="number" min="0" step="0.01" value={form.sales_price} onChange={set('sales_price')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" placeholder="5000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cost price (₹)</label>
            <input type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={set('notes')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>

          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Variants (e.g. Odoo brand surcharge)</label>
              <button type="button" onClick={addVariant} className="text-xs text-brand-600 hover:underline">+ Add variant</button>
            </div>
            {form.variants.map((v, i) => (
              <div key={i} className="flex gap-3 mb-2 items-center">
                <input value={v.name} onChange={(e) => setVariant(i, 'name', e.target.value)} placeholder="Variant name (e.g. Odoo)" className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                <input type="number" step="0.01" value={v.price_adjustment} onChange={(e) => setVariant(i, 'price_adjustment', e.target.value)} placeholder="Price adjustment ₹ (e.g. 560)" className="w-56 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                <span className="text-xs text-slate-500 w-32 shrink-0">
                  Final: {formatINR((Number(form.sales_price) || 0) + (Number(v.price_adjustment) || 0))}
                </span>
                <button type="button" onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-red-500 text-sm">✕</button>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
            <input type="checkbox" checked={form.active} onChange={set('active')} className="rounded" /> Active
          </label>

          <div className="md:col-span-3 flex items-center gap-3">
            <button disabled={saving} className="px-5 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save product'}
            </button>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
          </div>
        </form>
      )}

      {!products ? <LoadingState label="Loading products…" /> : (
        <DataTable
          rows={products}
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
            { key: 'type', header: 'Type' },
            { key: 'sales_price', header: 'Sales price', align: 'right', render: (r) => formatINR(r.sales_price) },
            { key: 'cost_price', header: 'Cost price', align: 'right', render: (r) => formatINR(r.cost_price) },
            { key: 'variants', header: 'Variants', render: (r) =>
              (r.variants || []).length === 0 ? '—' : (
                <ul className="text-xs space-y-0.5">
                  {(r.variants || []).map((v, i) => (
                    <li key={i}>{v.name} {Number(v.price_adjustment) >= 0 ? '+' : ''}{formatINR(v.price_adjustment)} → <span className="font-medium">{formatINR(Number(r.sales_price) + Number(v.price_adjustment))}</span></li>
                  ))}
                </ul>
              ) },
            { key: 'active', header: 'Status', render: (r) => <StatusBadge status={r.active ? 'ACTIVE' : 'CLOSED'} /> },
            { key: 'notes', header: 'Notes', render: (r) => <span className="text-xs text-slate-500">{r.notes || '—'}</span> },
          ]}
        />
      )}
    </div>
  )
}
