import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, X } from 'lucide-react'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import InvoiceLines from '../components/billing/InvoiceLines'
import { fetchInvoices, fetchInvoice, confirmInvoice, cancelInvoice } from '../services/billingService'
import { formatINR } from '../utils/currency'
import { formatDate } from '../utils/date'

function InvoicePrintModal({ invoice, onClose }) {
  if (!invoice) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 border border-slate-200 relative my-8 print:m-0 print:p-0 print:border-none print:shadow-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 print:hidden"
        >
          <X size={18} />
        </button>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-600 text-white font-black grid place-items-center text-base">
                S
              </span>
              <div>
                <h2 className="text-lg font-bold text-navy-900 leading-tight">Brightloop Software Pvt Ltd</h2>
                <p className="text-xs text-slate-500">GSTIN: 29AABCB1234F1Z5 · billing@brightloop.io</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-black text-navy-900">TAX INVOICE</h1>
            <p className="text-xs font-mono font-semibold text-brand-600 mt-0.5">{invoice.invoice_number}</p>
            <div className="mt-1">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="grid grid-cols-2 gap-6 text-xs mb-6">
          <div>
            <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Billed To</p>
            <p className="font-bold text-sm text-navy-900 mt-1">{invoice.customer_name || 'Customer'}</p>
            <p className="text-slate-600">{invoice.customer_email || 'billing@customer.example'}</p>
            <p className="text-slate-500">{invoice.customer_company || ''}</p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <span className="text-slate-400">Issue Date:</span>{' '}
              <span className="font-medium text-navy-900">{formatDate(invoice.issue_date || invoice.created_at)}</span>
            </div>
            <div>
              <span className="text-slate-400">Due Date:</span>{' '}
              <span className="font-medium text-red-600">{formatDate(invoice.due_date)}</span>
            </div>
            {invoice.billing_period_start && (
              <div>
                <span className="text-slate-400">Billing Period:</span>{' '}
                <span className="font-medium">
                  {formatDate(invoice.billing_period_start)} to {formatDate(invoice.billing_period_end)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Tax (18% GST)</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.lines || [
                {
                  id: 1,
                  description: 'Enterprise Subscription Service',
                  quantity: 1,
                  unit_price: invoice.subtotal || invoice.total,
                  tax_amount: invoice.tax_total || 0,
                  line_total: invoice.subtotal || invoice.total,
                },
              ]).map((l, i) => (
                <tr key={i}>
                  <td className="py-2.5 px-3 font-medium text-navy-900">{l.description || l.product_name}</td>
                  <td className="py-2.5 px-3 text-right">{l.quantity || 1}</td>
                  <td className="py-2.5 px-3 text-right">{formatINR(l.unit_price)}</td>
                  <td className="py-2.5 px-3 text-right">{formatINR(l.tax_amount || 0)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{formatINR(l.line_total || l.unit_price * (l.quantity || 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatINR(invoice.subtotal || invoice.total - (invoice.tax_total || 0))}</span>
            </div>
            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied:</span>
                <span>-{formatINR(invoice.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST (18%):</span>
              <span>{formatINR(invoice.tax_total || 0)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-navy-900">
              <span>Total Amount:</span>
              <span className="text-brand-700">{formatINR(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Amount Paid:</span>
              <span>{formatINR(invoice.paid_amount || invoice.amount_paid || 0)}</span>
            </div>
            <div className="border-t border-slate-100 pt-1 flex justify-between font-bold text-xs text-red-600">
              <span>Outstanding Balance:</span>
              <span>{formatINR(invoice.balance !== undefined ? invoice.balance : invoice.total - (invoice.paid_amount || 0))}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between print:hidden">
          <p className="text-[11px] text-slate-400">Generated securely by SubSecure AI Billing Engine</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Invoices() {
  const [rows, setRows] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [printInvoice, setPrintInvoice] = useState(null)

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
        {!rows ? (
          <LoadingState label="Loading invoices…" />
        ) : (
          <DataTable
            rows={rows}
            onRowClick={(r) => open(r.id)}
            columns={[
              {
                key: 'number',
                header: 'Invoice',
                render: (r) => <span className="font-medium text-navy-900">{r.number || r.invoice_number || `#${r.id}`}</span>,
              },
              {
                key: 'customer',
                header: 'Customer',
                render: (r) => r.customer_name || (r.customer_id ? `#${r.customer_id}` : '—'),
              },
              {
                key: 'period',
                header: 'Billing period',
                render: (r) => (
                  <span className="text-xs">
                    {r.billing_period_key ||
                      `${formatDate(r.billing_period_start)} – ${formatDate(r.billing_period_end)}`}
                  </span>
                ),
              },
              { key: 'issue_date', header: 'Issued', render: (r) => formatDate(r.issue_date || r.invoice_date) },
              { key: 'due_date', header: 'Due', render: (r) => formatDate(r.due_date) },
              { key: 'total', header: 'Total', align: 'right', render: (r) => formatINR(r.total) },
              { key: 'paid', header: 'Paid', align: 'right', render: (r) => formatINR(r.amount_paid) },
              {
                key: 'balance',
                header: 'Balance',
                align: 'right',
                render: (r) => (
                  <span className={balance(r) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                    {formatINR(balance(r))}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => {
                  const overdue =
                    r.due_date &&
                    new Date(r.due_date) < new Date() &&
                    !['PAID', 'CANCELLED'].includes(String(r.status || '').toUpperCase())
                  return <StatusBadge status={overdue ? 'OVERDUE' : r.status} />
                },
              },
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
              <h3 className="text-sm font-semibold text-navy-800">
                {selected.invoice_number || `Invoice #${selected.id}`}
              </h3>
              <StatusBadge status={selected.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {selected.customer_name || `Customer #${selected.customer_id}`}
            </p>

            <div className="mt-4">
              <InvoiceLines lines={selected.lines || selected.invoice_lines || []} />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatINR(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span className="text-emerald-600">-{formatINR(selected.discount_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span>+{formatINR(selected.tax_total)}</span>
              </div>
              <div className="flex justify-between font-semibold text-navy-900 pt-1.5 border-t border-slate-100">
                <span>Total</span>
                <span>{formatINR(selected.total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Paid</span>
                <span>{formatINR(selected.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Balance</span>
                <span className={balance(selected) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                  {formatINR(balance(selected))}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setPrintInvoice(selected)}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer size={14} /> Print / Save PDF
              </button>

              {['DRAFT'].includes(String(selected.status || '').toUpperCase()) && (
                <button
                  onClick={() => act(selected, 'confirm')}
                  disabled={!!busy}
                  className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 disabled:opacity-40"
                >
                  Confirm invoice
                </button>
              )}
              {['DRAFT', 'CONFIRMED'].includes(String(selected.status || '').toUpperCase()) && (
                <button
                  onClick={() => act(selected, 'cancel')}
                  disabled={!!busy}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-40"
                >
                  Cancel invoice
                </button>
              )}
              {balance(selected) > 0 &&
                ['CONFIRMED', 'OVERDUE'].includes(String(selected.status || '').toUpperCase()) && (
                  <Link
                    to="/payments"
                    className="px-4 py-2 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600"
                  >
                    Record payment
                  </Link>
                )}
            </div>
            {busy && <p className="mt-2 text-[11px] text-slate-400">Processing…</p>}
          </div>
        )}
      </div>

      {printInvoice && (
        <InvoicePrintModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      )}
    </div>
  )
}
