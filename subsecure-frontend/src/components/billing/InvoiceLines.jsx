import { formatINR } from '../../utils/currency'

export default function InvoiceLines({ lines = [] }) {
  if (!lines.length) return <p className="text-sm text-slate-400 py-4 text-center">No line items.</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <th className="py-2 font-medium">Item</th>
          <th className="py-2 font-medium text-right">Qty</th>
          <th className="py-2 font-medium text-right">Unit price</th>
          <th className="py-2 font-medium text-right">Tax</th>
          <th className="py-2 font-medium text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={l.id ?? i} className="border-b border-slate-100 last:border-0">
            <td className="py-2.5">{l.name || l.description || l.product_name || `Line ${i + 1}`}</td>
            <td className="py-2.5 text-right">{l.quantity ?? l.qty ?? 1}</td>
            <td className="py-2.5 text-right">{formatINR(l.unit_price ?? l.price)}</td>
            <td className="py-2.5 text-right">{formatINR(l.tax_amount ?? l.tax)}</td>
            <td className="py-2.5 text-right font-medium">{formatINR(l.amount ?? l.total ?? l.line_total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
