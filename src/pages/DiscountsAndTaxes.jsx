import { useEffect, useState } from 'react'
import { Tag, Percent, Plus, Trash2, ShieldAlert } from 'lucide-react'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import { api } from '../services/api'
import { formatINR } from '../utils/currency'
import { useAuth } from '../context/AuthContext'

export default function DiscountsAndTaxes() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [discounts, setDiscounts] = useState([])
  const [taxes, setTaxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountForm, setDiscountForm] = useState({
    name: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_quantity: 1,
    min_purchase: 0,
    usage_limit: 100,
  })

  const [showTaxModal, setShowTaxModal] = useState(false)
  const [taxForm, setTaxForm] = useState({
    name: '',
    region: 'IN',
    percentage: 18,
    category: 'Standard Goods & Services Tax (GST)',
  })

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([api.get('/discounts'), api.get('/taxes')])
      .then(([d, t]) => {
        setDiscounts(d || [])
        setTaxes(t || [])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreateDiscount(e) {
    e.preventDefault()
    try {
      await api.post('/discounts', discountForm)
      setFeedback({ type: 'success', text: `Discount rule "${discountForm.name}" created successfully.` })
      setShowDiscountModal(false)
      setDiscountForm({
        name: '',
        description: '',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        min_quantity: 1,
        min_purchase: 0,
        usage_limit: 100,
      })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create discount' })
    }
  }

  async function handleDeleteDiscount(id) {
    if (!confirm('Are you sure you want to delete this discount rule?')) return
    try {
      await api.delete(`/discounts/${id}`)
      setFeedback({ type: 'success', text: 'Discount rule removed successfully.' })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete discount' })
    }
  }

  async function handleCreateTax(e) {
    e.preventDefault()
    try {
      await api.post('/taxes', taxForm)
      setFeedback({ type: 'success', text: `Tax rule "${taxForm.name}" configured successfully.` })
      setShowTaxModal(false)
      setTaxForm({
        name: '',
        region: 'IN',
        percentage: 18,
        category: 'Standard Goods & Services Tax (GST)',
      })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create tax rule' })
    }
  }

  async function handleDeleteTax(id) {
    if (!confirm('Are you sure you want to remove this tax rule?')) return
    try {
      await api.delete(`/taxes/${id}`)
      setFeedback({ type: 'success', text: 'Tax rule removed successfully.' })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete tax rule' })
    }
  }

  if (loading) return <LoadingState label="Loading discounts and tax configuration…" />
  if (error && !discounts.length) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900">Discounts & Tax Management</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Admin Restricted
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure global billing discount policies, tiered volume incentives, and statutory tax rules.
          </p>
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

      {/* Discounts Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-navy-900">Active Discount Policies</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowDiscountModal(true)}
              className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Add Discount Rule
            </button>
          )}
        </div>

        {showDiscountModal && (
          <form onSubmit={handleCreateDiscount} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-navy-900 uppercase">New Discount Policy</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Rule Name</label>
                <input
                  required
                  value={discountForm.name}
                  onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                  placeholder="e.g. Q4 Growth Rebate"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Discount Type</label>
                <select
                  value={discountForm.discount_type}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Discount Value {discountForm.discount_type === 'PERCENTAGE' ? '(%)' : '(₹)'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={discountForm.discount_value}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <input
                  value={discountForm.description}
                  onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                  placeholder="e.g. Applied automatically when min quantity threshold is met"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Min Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={discountForm.min_quantity}
                  onChange={(e) => setDiscountForm({ ...discountForm, min_quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium"
              >
                Save Discount
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Rule Name</th>
                <th className="py-2.5 px-3 font-semibold">Type & Value</th>
                <th className="py-2.5 px-3 font-semibold">Min Quantity</th>
                <th className="py-2.5 px-3 font-semibold">Usage</th>
                <th className="py-2.5 px-3 font-semibold">Description</th>
                {isAdmin && <th className="py-2.5 px-3 font-semibold text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-navy-900">{d.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-brand-700">
                      {d.discount_type === 'PERCENTAGE' ? `${d.discount_value}% off` : `₹${d.discount_value} flat`}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{d.min_quantity} seat{d.min_quantity === 1 ? '' : 's'}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {d.usage_count} / {d.usage_limit || '∞'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{d.description || '—'}</td>
                  {isAdmin && (
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteDiscount(d.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Rules Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-navy-900">Tax Configurations & GST Rates</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowTaxModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Add Tax Rule
            </button>
          )}
        </div>

        {showTaxModal && (
          <form onSubmit={handleCreateTax} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-navy-900 uppercase">Configure Tax Rate</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Tax Name</label>
                <input
                  required
                  value={taxForm.name}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  placeholder="e.g. Standard GST 18%"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={taxForm.percentage}
                  onChange={(e) => setTaxForm({ ...taxForm, percentage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Jurisdiction / Region</label>
                <input
                  required
                  value={taxForm.region}
                  onChange={(e) => setTaxForm({ ...taxForm, region: e.target.value })}
                  placeholder="e.g. IN or Global"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-slate-700 font-medium mb-1">Category & Notes</label>
                <input
                  value={taxForm.category}
                  onChange={(e) => setTaxForm({ ...taxForm, category: e.target.value })}
                  placeholder="e.g. Indian Goods & Services Tax (GST) standard B2B rate"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTaxModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
              >
                Save Tax Rule
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Tax Name</th>
                <th className="py-2.5 px-3 font-semibold">Rate</th>
                <th className="py-2.5 px-3 font-semibold">Region</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                {isAdmin && <th className="py-2.5 px-3 font-semibold text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-navy-900">{t.name}</td>
                  <td className="py-2.5 px-3 font-semibold text-navy-900">{t.percentage}%</td>
                  <td className="py-2.5 px-3 text-slate-600">{t.region}</td>
                  <td className="py-2.5 px-3 text-slate-500">{t.category || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteTax(t.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete tax rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
