import { formatDateTime } from '../../utils/date'

export default function AuditTimeline({ events = [] }) {
  if (!events.length) return <p className="text-sm text-slate-400 py-6 text-center">No audit events recorded yet.</p>
  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-5">
      {events.map((e, i) => (
        <li key={e.event_id || e.id || i} className="ml-5">
          <span className="absolute -left-[7px] mt-1.5 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-white shadow" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-navy-900">{e.event_type || e.type || 'Event'}</span>
            <span className="text-[11px] text-slate-400 font-mono">
              #{e.sequence ?? e.seq ?? '·'} · {String(e.event_hash || e.hash || '').slice(0, 12)}…
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDateTime(e.timestamp || e.created_at)}
            {e.actor_id != null && <> · actor <span className="font-mono">{e.actor_id}</span></>}
            {e.aggregate_type && <> · {e.aggregate_type} #{e.aggregate_id}</>}
          </p>
        </li>
      ))}
    </ol>
  )
}
