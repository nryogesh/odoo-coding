import { useEffect, useState } from 'react'
import DataTable from '../components/common/DataTable'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import IntegrityStatus from '../components/audit/IntegrityStatus'
import { fetchAuditEvents, verifyLedger, fetchSecurityAlerts } from '../services/analyticsService'
import { formatDateTime } from '../utils/date'

export default function AuditCenter() {
  const [events, setEvents] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [verification, setVerification] = useState(null)
  const [status, setStatus] = useState('unchecked')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function load() {
    setError(null)
    fetchAuditEvents({ limit: 50 }).then(setEvents).catch(setError)
    fetchSecurityAlerts().then(setAlerts).catch(() => setAlerts([]))
  }
  useEffect(load, [])

  async function verify() {
    setBusy(true)
    setError(null)
    try {
      const res = await verifyLedger()
      setVerification(res)
      setStatus(res.valid === false ? 'failed' : 'verified')
    } catch (e) {
      setError(e)
      setStatus('failed')
    } finally {
      setBusy(false)
    }
  }

  const lastHash = events?.[0] ? (events[0].event_hash || events[0].hash) : verification?.latest_hash

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <IntegrityStatus
            status={status}
            lastVerifiedAt={verification?.verified_at || verification?.timestamp}
            eventCount={verification?.event_count ?? verification?.total_events ?? events?.length}
            latestHash={lastHash}
            firstInvalidSequence={verification?.first_invalid_sequence}
          />
          {error && <ErrorState error={error} onRetry={load} />}
        </div>
        <button
          onClick={verify}
          disabled={busy}
          className="px-5 py-3 rounded-xl bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-50 h-fit"
        >
          {busy ? 'Verifying chain…' : 'Verify Ledger'}
        </button>
      </div>

      {alerts.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
          <h2 className="text-sm font-semibold text-navy-800 mb-3">Security & anomaly alerts</h2>
          <ul className="divide-y divide-slate-100">
            {alerts.slice(0, 8).map((a, i) => (
              <li key={a.id ?? i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-navy-900">{a.title || a.type || a.rule || 'Alert'}</p>
                  <p className="text-xs text-slate-500">{a.message || a.reason || a.description || ''}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${String(a.severity || '').toLowerCase() === 'high' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {a.severity || 'warning'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">Deterministic rules; ML signals, when present, are advisory warnings only.</p>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide mb-3">Audit events</h2>
        {!events ? <LoadingState label="Loading audit events…" /> : (
          <DataTable
            rows={events}
            columns={[
              { key: 'sequence_num', header: 'Seq', render: (r) => <span className="font-mono text-xs">{r.sequence_num ?? '—'}</span> },
              { key: 'event_type', header: 'Event', render: (r) => <span className="font-medium text-navy-900">{r.event_type || r.type}</span> },
              { key: 'aggregate', header: 'Aggregate', render: (r) => r.aggregate_type ? `${r.aggregate_type} #${r.aggregate_id}` : '—' },
              { key: 'actor_user_id', header: 'Actor', render: (r) => <span className="font-mono text-xs">{r.actor_user_id ?? 'system'}</span> },
              { key: 'timestamp', header: 'Timestamp', render: (r) => formatDateTime(r.timestamp || r.created_at) },
              { key: 'event_hash', header: 'Hash', render: (r) => <span className="font-mono text-[11px] text-slate-500">{String(r.event_hash || r.hash || '').slice(0, 18)}…</span> },
            ]}
          />
        )}
        <p className="mt-2 text-[11px] text-slate-400">
          Append-only SHA-256 hash chain — each event hash binds the previous one. Tamper-evident; a privileged attacker
          who rewrites the whole database could still forge the chain, so this is verification, not absolute immutability.
        </p>
      </section>
    </div>
  )
}
