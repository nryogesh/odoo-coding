import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import InvoiceLines from '../components/billing/InvoiceLines'
import { fetchInvoices, fetchInvoice, confirmInvoice, cancelInvoice } from '../services/billingService'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'

export default function Invoices() {
  const [rows, setRows] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  function load() {
    setError(null)
    fetchInvoices().then(setRows).catch(setError)
  }
  useEffect(load, [])

  async function open(id) {
    setBusy(id)
    try {
      setSelected(await fetchInvoice(id))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  async function act(inv, action) {
    setBusy(inv.id)
    try {
      if (action === 'confirm') await confirmInvoice(inv.id)
      else await cancelInvoice(inv.id)
      await open(inv.id)
      load()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  if (error && !rows) return <ErrorState error={error} onRetry={load} />

  const balance = (r) => {
    if (r.balance !== undefined) return r.balance
    if (r.paid_amount !== undefined) return Number(r.total ?? 0) - Number(r.paid_amount ?? 0)
    return null
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-3">
        {!rows ? <LoadingState label="Loading invoices…" /> : (
          <DataTable
            rows={rows}
            onRowClick={(r) => open(r.id)}
            columns={[
              { key: 'number', header: 'Invoice', render: (r) => <span className="font-medium text-navy-900">{r.number || r.invoice_number || `#${r.id}`}</span> },
              { key: 'customer', header: 'Customer', render: (r) => r.customer_name || (r.customer_id ? `#${r.customer_id}` : '—') },
              { key: 'period', header: 'Billing period', render: (r) => <span className="text-xs">{r.billing_period_key || `${formatDate(r.billing_period_start)} – ${formatDate(r.billing_period_end)}`}</span> },
              { key: 'issue_date', header: 'Issued', render: (r) => formatDate(r.issue_date || r.invoice_date) },
              { key: 'due_date', header: 'Due', render: (r) => formatDate(r.due_date) },
              { key: 'total', header: 'Total', align: 'right', render: (r) => formatINR(r.total) },
              { key: 'paid', header: 'Paid', align: 'right', render: (r) => formatINR(r.amount_paid) },
              { key: 'balance', header: 'Balance', align: 'right', render: (r) => <span className={balance(r) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{formatINR(balance(r))}</span> },
              { key: 'status', header: 'Status', render: (r) => {
                const overdue = r.due_date && new Date(r.due_date) < new Date() && !['PAID', 'CANCELLED'].includes(String(r.status || '').toUpperCase())
                return <StatusBadge status={overdue ? 'OVERDUE' : r.status} />
              } },
            ]}
          />
        )}
      </div>

      <div className="lg:col-span-2 lg:sticky lg:top-20">
        {!selected ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-10 text-center text-sm text-slate-400">
            Select an invoice to view line items, tax and discount breakdown.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-800">{selected.invoice_number || `Invoice #${selected.id}`}</h3>
              <StatusBadge status={selected.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {selected.customer_name || `Customer #${selected.customer_id}`}
            </p>

            <div className="mt-4">
              <InvoiceLines lines={selected.lines || selected.invoice_lines || []} />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatINR(selected.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="text-emerald-600">-{formatINR(selected.discount_total)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>+{formatINR(selected.tax_total)}</span></div>
              <div className="flex justify-between font-semibold text-navy-900 pt-1.5 border-t border-slate-100"><span>Total</span><span>{formatINR(selected.total)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">Paid</span><span>{formatINR(selected.amount_paid)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">Balance</span><span className={balance(selected) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{formatINR(balance(selected))}</span></div>
            </div>

            <div className="mt-5 flex gap-2">
              {['DRAFT'].includes(String(selected.status || '').toUpperCase()) && (
                <button onClick={() => act(selected, 'confirm')} disabled={!!busy} className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 disabled:opacity-40">Confirm invoice</button>
              )}
              {['DRAFT', 'CONFIRMED'].includes(String(selected.status || '').toUpperCase()) && (
                <button onClick={() => act(selected, 'cancel')} disabled={!!busy} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-40">Cancel invoice</button>
              )}
              {balance(selected) > 0 && ['CONFIRMED', 'OVERDUE'].includes(String(selected.status || '').toUpperCase()) && (
                <Link to="/payments" className="px-4 py-2 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600">Record payment</Link>
              )}
            </div>
            {busy && <p className="mt-2 text-[11px] text-slate-400">Processing…</p>}
          </div>
        )}
      </div>
    </div>
  )
}
