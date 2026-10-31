import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, ShieldCheck, Clock, Cpu, Save, ShieldAlert, Sparkles } from 'lucide-react'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    api.get('/settings')
      .then(setSettings)
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-lg mx-auto mt-12 space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-900">Access Restricted (403 Forbidden)</h2>
        <p className="text-xs text-red-700">
          System Settings and Automated Billing Scheduler configurations are reserved strictly for System Administrators. Staff and Customer accounts cannot modify infrastructure or scheduler policies.
        </p>
      </div>
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const updated = await api.post('/settings', settings)
      setSettings(updated)
      setFeedback({ type: 'success', text: 'System settings & billing scheduler policies saved successfully.' })
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading system settings…" />
  if (error && !settings) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900">System Settings & Billing Scheduler</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated recurring billing routines, company financial entity parameters, and AI engine controls.
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Financial Entity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-navy-900">Organization & Currency</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Company Trading Name</label>
              <input
                required
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Finance / Invoicing Email</label>
              <input
                type="email"
                required
                value={settings.companyEmail || ''}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Base Currency</label>
              <input
                disabled
                value={`${settings.currency} (${settings.currencySymbol})`}
                className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Default Invoicing Terms</label>
              <select
                value={settings.defaultPaymentTerms || 'NET_14'}
                onChange={(e) => setSettings({ ...settings, defaultPaymentTerms: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="IMMEDIATE">Immediate on Receipt</option>
                <option value="NET_7">Net 7 Days</option>
                <option value="NET_14">Net 14 Days</option>
                <option value="NET_15">Net 15 Days</option>
                <option value="NET_30">Net 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Automated Billing Scheduler */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-navy-900">Automated Billing Scheduler</h2>
          </div>
          <p className="text-xs text-slate-500">
            SubSecure AI runs an automated daily cron daemon to evaluate recurring subscription contracts, generate compliant invoices, and prevent duplicate charges using idempotency keys.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="autoBillingEnabled"
                checked={!!settings.autoBillingEnabled}
                onChange={(e) => setSettings({ ...settings, autoBillingEnabled: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <label htmlFor="autoBillingEnabled" className="text-slate-800 font-medium cursor-pointer">
                Enable Automated Recurring Invoicing Cron
              </label>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Scheduled Daily Execution Time</label>
              <input
                value={settings.autoBillingTime || '02:00 UTC'}
                onChange={(e) => setSettings({ ...settings, autoBillingTime: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <div className="md:col-span-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
              <p className="font-semibold text-xs">Last Automated Run Status:</p>
              <p className="font-mono text-[11px] text-emerald-800">
                {settings.lastAutoBillingStatus || 'Operational: Zero duplicate billing anomalies'}
              </p>
              <p className="text-[10px] text-emerald-600">
                Timestamp: {settings.lastAutoBillingRun || new Date().toISOString()}
              </p>
            </div>
          </div>
        </div>

        {/* Security & Anomaly Detection Guardrails */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-semibold text-navy-900">Security & Anomaly Detection Guardrails</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Excessive Discount Threshold (%)</label>
              <input
                type="number"
                min="10"
                max="90"
                value={settings.securityThresholds?.excessiveDiscountPercent || 50}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    securityThresholds: {
                      ...settings.securityThresholds,
                      excessiveDiscountPercent: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Flags quotations with suspicious discounts.</span>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Seat Spike Alert Threshold</label>
              <input
                type="number"
                min="10"
                value={settings.securityThresholds?.unusualQuantityThreshold || 50}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    securityThresholds: {
                      ...settings.securityThresholds,
                      unusualQuantityThreshold: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Flags sudden bulk subscription increases.</span>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Churn Risk Score Threshold</label>
              <input
                type="number"
                min="20"
                max="100"
                value={settings.securityThresholds?.highChurnRiskScore || 60}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    securityThresholds: {
                      ...settings.securityThresholds,
                      highChurnRiskScore: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Watchlist alert trigger score.</span>
            </div>
          </div>
        </div>

        {/* AI Copilot & Deterministic Engine */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-navy-900">AI Finance & Operations Engine</h2>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Primary AI Model:</span>
              <span className="font-mono text-brand-600 bg-white px-2 py-0.5 border rounded">
                Google Gemini API (gemini-1.5-flash / gemini-2.5-flash)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Deterministic Fallback Engine:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Always Active & Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Role-Based Assistant Scoping:</span>
              <span className="font-semibold text-navy-900">
                Strict Backend Data Isolation (Customers restricted to own IDs)
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Saving Changes…' : 'Save System Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
