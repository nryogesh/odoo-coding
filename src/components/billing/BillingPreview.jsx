import DataTable from '../common/DataTable'
import StatusBadge from '../common/StatusBadge'
import { formatINR } from '../../utils/currency'

export default function BillingPreview({ rows = [] }) {
  return (
    <DataTable
      rows={rows}
      empty="No subscriptions in this preview."
      columns={[
        { key: 'subscription', header: 'Subscription', render: (r) => r.subscription_number || r.subscription_no || r.subscription_id || '—' },
        { key: 'customer', header: 'Customer', render: (r) => r.customer_name || (r.customer_id ? `Customer #${r.customer_id}` : '—') },
        { key: 'period', header: 'Billing period', render: () => 'Selected period' },
        { key: 'subtotal', header: 'Subtotal', align: 'right', render: (r) => formatINR(r.subtotal) },
        { key: 'tax', header: 'Tax', align: 'right', render: (r) => formatINR(r.tax_total) },
        { key: 'discount', header: 'Discount', align: 'right', render: (r) => formatINR(r.discount_total) },
        { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">{formatINR(r.total)}</span> },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={r.status || 'READY'} />
              {r.anomaly_flags?.length > 0 && (
                <span className="text-[11px] text-amber-600" title={r.anomaly_flags.join('; ')}>
                  ⚠ {r.anomaly_flags[0]}
                </span>
              )}
            </div>
          ),
        },
        { key: 'reason', header: 'Warning / reason', render: (r) => <span className="text-xs text-slate-500">{r.reason || r.warning || '—'}</span> },
      ]}
    />
  )
}
