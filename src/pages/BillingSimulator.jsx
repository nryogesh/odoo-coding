import { useState } from 'react'
import MetricCard from '../components/common/MetricCard'
import BillingPreview from '../components/billing/BillingPreview'
import LoadingState from '../components/common/LoadingState'
import { simulateBilling, executeBilling } from '../services/billingService'
import { currentMonthKey } from '../utils/date'
import { formatINR } from '../utils/currency'
import { Link } from 'react-router-dom'

export default function BillingSimulator() {
  const [period, setPeriod] = useState(currentMonthKey())
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [executed, setExecuted] = useState(null)

  async function run() {
    setBusy(true)
    setError(null)
    setResult(null)
    setExecuted(null)
    try {
      setResult(await simulateBilling({ billing_period_key: period }))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  async function execute() {
    setConfirming(false)
    setBusy(true)
    setError(null)
    try {
      const res = await executeBilling({ billing_period_key: period, confirm: true })
      setExecuted(res)
      setResult(await simulateBilling({ billing_period_key: period }).catch(() => result))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const summary = result || {}
  const previews = result?.items || []
  const ready = summary.ready_count
  const skipped = summary.skipped_count
  const blocked = summary.blocked_count
  const expected = summary.expected_total
  const taxTotal = summary.tax_total
  const discTotal = summary.discount_total
  const created = (executed?.items || []).filter((item) => item.result === 'GENERATED')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <p className="text-sm text-slate-600 max-w-2xl">
          Preview every invoice that a billing run would create, with taxes, discounts and validation warnings —
          before anything is written. Simulation never creates invoices; execution requires explicit confirmation and is
          protected against duplicate billing per subscription-period.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-slate-600">Billing period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <button
            onClick={run}
            disabled={busy || !period}
            className="px-5 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
          >
            {busy && !result ? 'Simulating…' : 'Run Simulation'}
          </button>
          {result && (
            <button
              onClick={() => setConfirming(true)}
              disabled={busy || (ready ?? 0) === 0}
              className="px-5 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-40"
            >
              Execute Billing Batch
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error.message}</p>}
      </div>

      {busy && !result && <LoadingState label="Running billing rehearsal…" />}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard label="Ready to bill" value={ready ?? '—'} tone="emerald" />
            <MetricCard label="Skipped" value={skipped ?? '—'} />
            <MetricCard label="Blocked" value={blocked ?? '—'} tone={blocked > 0 ? 'red' : 'default'} />
            <MetricCard label="Expected billing total" value={formatINR(expected)} tone="brand" />
            <MetricCard label="Tax total" value={formatINR(taxTotal)} />
            <MetricCard label="Discount total" value={formatINR(discTotal)} />
          </div>

          <BillingPreview rows={previews} />

          {executed && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-emerald-800">Billing batch executed</p>
              {executed.duplicate_count > 0 && (
                <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Duplicate protection active — {executed.duplicate_count} invoice(s) already existed for this period and were preserved.
                </p>
              )}
              {created.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                  {created.map((inv, i) => (
                    <li key={inv.invoice_id ?? i}>
                      <Link to="/invoices" className="text-brand-700 hover:underline font-medium">
                        {inv.invoice_number || `Invoice #${inv.invoice_id}`}
                      </Link>{' '}
                      — generated successfully
                    </li>
                  ))}
                </ul>
              )}
              {executed.generated_count !== undefined && (
                <p className="mt-2 text-xs text-emerald-700">{executed.generated_count} invoice(s) created.</p>
              )}
            </div>
          )}
        </>
      )}

      {confirming && (
        <div className="fixed inset-0 bg-navy-900/50 grid place-items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-navy-900">Execute billing batch for {period}?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will create <b>{ready ?? 0} invoice(s)</b> totalling <b>{formatINR(expected)}</b>. This action writes
              real invoices to the database. Duplicate subscription-period pairs will be skipped by the idempotency guard.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-navy-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={execute}
                disabled={busy}
                className="px-5 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? 'Executing…' : 'Yes, execute billing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
