import { useEffect, useState } from 'react'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import { fetchSubscriptions } from '../services/subscriptionService'
import { formatINR } from '../utils/currency'

export default function Customers() {
  const [subs, setSubs] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    setError(null)
    fetchSubscriptions().then(setSubs).catch(setError)
  }
  useEffect(load, [])

  if (error && !subs) return <ErrorState error={error} onRetry={load} />

  const map = new Map()
  for (const s of subs || []) {
    const key = s.customer_id ?? s.customer_name ?? 'unknown'
    if (!map.has(key)) map.set(key, { id: key, name: s.customer_name || `Customer #${key}`, subs: [], mrr: 0 })
    const c = map.get(key)
    c.subs.push(s)
    if (String(s.status || '').toUpperCase() === 'ACTIVE') c.mrr += Number(s.total ?? s.amount ?? s.plan?.price ?? 0)
  }
  const customers = [...map.values()]

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Customer directory derived from live subscription records.</p>
      {!subs ? (
        <LoadingState label="Loading customers…" />
      ) : (
        <DataTable
          rows={customers}
          columns={[
            { key: 'name', header: 'Customer', render: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
            { key: 'subs', header: 'Subscriptions', align: 'right', render: (r) => r.subs.length },
            {
              key: 'active',
              header: 'Active',
              align: 'right',
              render: (r) => r.subs.filter((s) => String(s.status).toUpperCase() === 'ACTIVE').length,
            },
            { key: 'mrr', header: 'Recurring value', align: 'right', render: (r) => formatINR(r.mrr) },
            {
              key: 'statuses',
              header: 'Statuses',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {[...new Set(r.subs.map((s) => String(s.status).toUpperCase()))].map((st) => (
                    <StatusBadge key={st} status={st} />
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
