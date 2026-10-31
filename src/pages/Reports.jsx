import { useEffect, useState } from 'react'
import { BarChart3, Download, FileSpreadsheet, Calendar, AlertCircle } from 'lucide-react'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import { api } from '../services/api'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'

export default function Reports() {
  const [reportData, setReportData] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([api.get('/reports'), api.get('/subscriptions')])
      .then(([rep, subs]) => {
        setReportData(rep)
        setSubscriptions(subs || [])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function exportToCSV(filename, rows, headers) {
    if (!rows || !rows.length) return
    const headerRow = headers.map((h) => `"${h.label}"`).join(',')
    const dataRows = rows.map((row) =>
      headers
        .map((h) => {
          const val = typeof h.accessor === 'function' ? h.accessor(row) : row[h.accessor]
          return `"${String(val ?? '').replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...dataRows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <LoadingState label="Compiling business intelligence reports…" />
  if (error && !reportData) return <ErrorState error={error} onRetry={load} />

  const { plans_breakdown = [], overdue_aging = [] } = reportData || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Financial & Operational Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Exportable recurring revenue summaries, plan performance analysis, and invoice aging schedules.
          </p>
        </div>
      </div>

      {/* Plan Performance & MRR Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-navy-900">Plan Recurring Revenue & Seat Distribution</h2>
          </div>
          <button
            onClick={() =>
              exportToCSV('SubSecure_Plan_Revenue_Report', plans_breakdown, [
                { label: 'Plan Name', accessor: 'plan_name' },
                { label: 'Billing Interval', accessor: 'interval' },
                { label: 'Unit Price (INR)', accessor: 'price' },
                { label: 'Active Contracts', accessor: 'active_subscriptions' },
                { label: 'MRR (INR)', accessor: 'mrr' },
                { label: 'Annual Run Rate ARR (INR)', accessor: 'arr' },
              ])
            }
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors self-start"
          >
            <Download size={14} /> Export Plan Report (CSV)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Plan Name</th>
                <th className="py-2.5 px-3 font-semibold">Interval</th>
                <th className="py-2.5 px-3 font-semibold text-right">Price</th>
                <th className="py-2.5 px-3 font-semibold text-right">Active Subs</th>
                <th className="py-2.5 px-3 font-semibold text-right">Monthly (MRR)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Annual (ARR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans_breakdown.map((p) => (
                <tr key={p.plan_id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-navy-900">{p.plan_name}</td>
                  <td className="py-2.5 px-3 capitalize text-slate-600">{p.interval.toLowerCase()}</td>
                  <td className="py-2.5 px-3 text-right">{formatINR(p.price)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{p.active_subscriptions}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-brand-700">{formatINR(p.mrr)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{formatINR(p.arr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Aging Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-navy-900">Overdue Invoices Aging Schedule</h2>
          </div>
          <button
            onClick={() =>
              exportToCSV('SubSecure_Aging_Report', overdue_aging, [
                { label: 'Invoice #', accessor: 'invoice_number' },
                { label: 'Customer', accessor: 'customer_name' },
                { label: 'Due Date', accessor: 'due_date' },
                { label: 'Days Past Due', accessor: 'days_past_due' },
                { label: 'Aging Bucket', accessor: 'bucket' },
                { label: 'Total (INR)', accessor: 'total' },
                { label: 'Outstanding Balance (INR)', accessor: 'balance' },
              ])
            }
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors self-start"
          >
            <Download size={14} /> Export Aging Report (CSV)
          </button>
        </div>

        {overdue_aging.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No outstanding or overdue invoices.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Due Date</th>
                  <th className="py-2.5 px-3 font-semibold">Days Overdue</th>
                  <th className="py-2.5 px-3 font-semibold">Aging Bucket</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdue_aging.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-navy-900">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3 text-slate-700">{inv.customer_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDate(inv.due_date)}</td>
                    <td className="py-2.5 px-3 font-medium text-red-600">
                      {inv.days_past_due > 0 ? `${inv.days_past_due} days` : 'Current'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.bucket === '60+ days'
                            ? 'bg-red-100 text-red-800'
                            : inv.bucket === '31-60 days'
                            ? 'bg-amber-100 text-amber-800'
                            : inv.bucket === '1-30 days'
                            ? 'bg-yellow-50 text-yellow-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {inv.bucket}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatINR(inv.total)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-700">{formatINR(inv.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Master Register */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-navy-900">Active Subscription Contract Register</h2>
          </div>
          <button
            onClick={() =>
              exportToCSV('SubSecure_Subscriptions_Register', subscriptions, [
                { label: 'Subscription #', accessor: 'subscription_number' },
                { label: 'Customer', accessor: 'customer_name' },
                { label: 'Plan', accessor: 'plan_name' },
                { label: 'Status', accessor: 'status' },
                { label: 'Start Date', accessor: 'start_date' },
                { label: 'Expiry Date', accessor: 'expiry_date' },
                { label: 'Total Value (INR)', accessor: 'total' },
              ])
            }
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors self-start"
          >
            <Download size={14} /> Export Subscriptions Register (CSV)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Subscription #</th>
                <th className="py-2.5 px-3 font-semibold">Customer</th>
                <th className="py-2.5 px-3 font-semibold">Plan</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Expiry Date</th>
                <th className="py-2.5 px-3 font-semibold text-right">Contract Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.slice(0, 15).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-navy-900">{s.subscription_number}</td>
                  <td className="py-2.5 px-3 text-slate-700">{s.customer_name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{s.plan_name}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'PAUSED'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{formatDate(s.expiry_date)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-navy-900">{formatINR(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
