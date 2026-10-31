import { useEffect, useState } from 'react'
import { FileText, Plus, Trash2, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import { api } from '../services/api'
import { formatINR } from '../utils/currency'

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [plans, setPlans] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plan_id: '',
    default_quantity: 1,
    tax_percent: 18,
    discount_percent: 0,
    valid_days: 30,
  })
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([api.get('/templates'), api.get('/plans'), api.get('/products')])
      .then(([t, pl, pr]) => {
        setTemplates(t || [])
        setPlans(pl || [])
        setProducts(pr || [])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    try {
      const selectedPlan = plans.find((p) => p.id === Number(formData.plan_id))
      const prod = products.find((pr) => pr.id === selectedPlan?.product_id)
      const lines = selectedPlan
        ? [
            {
              product_id: selectedPlan.product_id,
              quantity: Number(formData.default_quantity || 1),
              unit_price: selectedPlan.price,
              product_name: prod ? prod.name : 'Subscription Product',
            },
          ]
        : []

      await api.post('/templates', {
        ...formData,
        lines,
      })
      setShowCreate(false)
      setFormData({
        name: '',
        description: '',
        plan_id: '',
        default_quantity: 1,
        tax_percent: 18,
        discount_percent: 0,
        valid_days: 30,
      })
      load()
    } catch (err) {
      alert(err.message || 'Failed to create template')
    }
  }

  async function handleDelete(tId) {
    if (!confirm('Are you sure you want to remove this quotation template?')) return
    try {
      await api.delete(`/templates/${tId}`)
      load()
    } catch (err) {
      alert(err.message || 'Failed to delete template')
    }
  }

  function handleUseTemplate(template) {
    navigate('/quotations', { state: { template } })
  }

  if (loading) return <LoadingState label="Loading quotation templates…" />
  if (error && !templates.length) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Quotation Templates</h1>
          <p className="text-xs text-slate-500 mt-1">
            Predefined subscription bundles, discount levels, and tax setups for rapid sales quotation creation.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium flex items-center gap-2 transition-colors self-start"
        >
          <Plus size={15} /> New Template
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-navy-900">Create Quotation Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Template Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Standard SaaS Monthly Bundle"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Base Plan</label>
              <select
                required
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select Plan…</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.price)} / {p.billing_interval})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Description / Notes</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Standard 12-month contract with 18% GST and optional bulk discount"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Default Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.default_quantity}
                onChange={(e) => setFormData({ ...formData, default_quantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Tax % (GST)</label>
              <input
                type="number"
                min="0"
                value={formData.tax_percent}
                onChange={(e) => setFormData({ ...formData, tax_percent: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Validity Period (Days)</label>
              <input
                type="number"
                min="1"
                value={formData.valid_days}
                onChange={(e) => setFormData({ ...formData, valid_days: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium"
            >
              Save Template
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((t) => {
          const plan = plans.find((p) => p.id === t.plan_id)
          return (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-600" />
                    <h3 className="font-bold text-sm text-navy-900">{t.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">{t.description || 'Pre-configured quotation bundle.'}</p>

                <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Associated Plan:</span>
                    <span className="font-medium text-navy-900">{plan ? plan.name : `Plan #${t.plan_id || '—'}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Default Quantity:</span>
                    <span className="font-medium">{t.default_quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount & Tax:</span>
                    <span className="font-medium">{t.discount_percent}% off · {t.tax_percent}% tax</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Validity:</span>
                    <span className="font-medium">{t.valid_days} days</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {plan ? `${formatINR(plan.price * t.default_quantity)} / ${plan.billing_interval}` : ''}
                </span>
                <button
                  onClick={() => handleUseTemplate(t)}
                  className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  Use Template <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
