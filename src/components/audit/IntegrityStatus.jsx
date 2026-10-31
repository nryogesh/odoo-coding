import { formatDateTime } from '../../utils/date'

const STATES = {
  verified: { label: 'Verified', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  failed: { label: 'Verification failed', cls: 'border-red-200 bg-red-50 text-red-700' },
  unchecked: { label: 'Not checked', cls: 'border-slate-200 bg-slate-50 text-slate-500' },
}

export default function IntegrityStatus({ status, lastVerifiedAt, eventCount, latestHash, firstInvalidSequence }) {
  const s = STATES[status] || STATES.unchecked
  return (
    <div className={`rounded-xl border p-5 ${s.cls}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Ledger integrity — SHA-256 hash-chain</p>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/70 border border-current">
          {s.label}
        </span>
      </div>
      <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="opacity-70">Last verification</p>
          <p className="font-medium mt-0.5">{formatDateTime(lastVerifiedAt)}</p>
        </div>
        <div>
          <p className="opacity-70">Total events</p>
          <p className="font-medium mt-0.5">{eventCount ?? '—'}</p>
        </div>
        <div>
          <p className="opacity-70">Latest hash</p>
          <p className="font-mono font-medium mt-0.5">{latestHash ? `${latestHash.slice(0, 16)}…` : '—'}</p>
        </div>
      </div>
      {status === 'failed' && (
        <p className="mt-3 text-xs font-medium">
          First invalid sequence: {firstInvalidSequence ?? 'unknown'} — the ledger may have been tampered with.
        </p>
      )}
      <p className="mt-3 text-[11px] opacity-60">
        Tamper-evident hash chain. Events are append-only and each hash includes the previous one.
      </p>
    </div>
  )
}
