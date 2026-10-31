import { useEffect, useState } from 'react'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import { fetchPayments, createPayment, fetchInvoices, fetchInvoiceBalance } from '../services/billingService'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'

const METHODS = ['upi', 'bank_transfer', 'card', 'cash', 'cheque']
const EMPTY = { invoice_id: '', amount: '', method: 'upi', payment_date: '', reference: '', note: '' }

export default function Payments() {
  const [rows, setRows] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [receipt, setReceipt] = useState(null)

  function load() {
    setError(null)
    Promise.all([fetchPayments(), fetchInvoices()])
      .then(([p, inv]) => { setRows(p); setInvoices(inv.filter((i) => !['PAID', 'CANCELLED'].includes(String(i.status || '').toUpperCase()))) })
      .catch(setError)
  }
  useEffect(load, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const selectedInvoice = invoices.find((i) => i.id === Number(form.invoice_id))

  async function submit(e) {
    e.preventDefault()
    setFormError(null)
    setReceipt(null)
    setSaving(true)
    try {
      const before = form.invoice_id ? await fetchInvoiceBalance(form.invoice_id).catch(() => null) : null
      const res = await createPayment({
        invoice_id: Number(form.invoice_id),
        amount: Number(form.amount),
        method: form.method,
        payment_date: form.payment_date || new Date().toISOString().slice(0, 10),
        reference: form.reference || undefined,
        note: form.note || undefined,
      })
      const after = form.invoice_id ? await fetchInvoiceBalance(form.invoice_id).catch(() => null) : null
      setReceipt({
        payment: res,
        balanceBefore: before?.balance ?? before?.outstanding ?? before,
        balanceAfter: after?.balance ?? after?.outstanding ?? after,
      })
      setForm(EMPTY)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error && !rows) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="grid lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-navy-800">Record payment</h3>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              Simulated payment entry — no real payment gateway is connected.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Invoice</label>
            <select required value={form.invoice_id} onChange={set('invoice_id')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
              <option value="">Select open invoice…</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number || `INV-${i.id}`} · {i.customer_name || `#${i.customer_id}`} · balance {formatINR(i.balance ?? (Number(i.total ?? 0) - Number(i.paid_amount ?? 0)))}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
              <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} placeholder={selectedInvoice ? String(Number(selectedInvoice.total ?? 0) - Number(selectedInvoice.paid_amount ?? 0)) : ''} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
              <select value={form.method} onChange={set('method')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                {METHODS.map((m) => <option key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input type="date" value={form.payment_date} onChange={set('payment_date')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reference</label>
              <input value={form.reference} onChange={set('reference')} placeholder="UPI ref / txn id" className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
            <input value={form.note} onChange={set('note')} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>

          <button disabled={saving} className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">
            {saving ? 'Recording…' : 'Record payment'}
          </button>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
        </form>

        {receipt && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-emerald-800">Payment recorded</p>
            <div className="mt-2 text-xs text-emerald-700 space-y-1">
              <p>Invoice balance before: <b>{formatINR(receipt.balanceBefore)}</b></p>
              <p>Invoice balance after: <b>{formatINR(receipt.balanceAfter)}</b></p>
              {(receipt.payment?.invoice_status || receipt.payment?.status) && (
                <p>Invoice status: <b>{receipt.payment.invoice_status || receipt.payment.status}</b></p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-3">
        {!rows ? <LoadingState label="Loading payments…" /> : (
          <DataTable
            rows={rows}
            columns={[
              { key: 'id', header: '#', render: (r) => r.id },
              { key: 'invoice', header: 'Invoice', render: (r) => r.invoice_number || (r.invoice_id ? `INV-${r.invoice_id}` : '—') },
              { key: 'customer', header: 'Customer', render: (r) => r.customer_name || '—' },
              { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-medium">{formatINR(r.amount)}</span> },
              { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{(r.method || '').replace(/_/g, ' ')}</span> },
              { key: 'payment_date', header: 'Date', render: (r) => formatDate(r.payment_date || r.date) },
              { key: 'reference', header: 'Reference', render: (r) => <span className="text-xs text-slate-500 font-mono">{r.reference || '—'}</span> },
            ]}
          />
        )}
      </div>
    </div>
  )
}
