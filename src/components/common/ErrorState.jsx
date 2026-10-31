export default function ErrorState({ error, onRetry }) {
  const message = error?.message || 'Something went wrong.'
  const isForbidden = error?.status === 403
  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-card p-8 text-center">
      <p className="text-sm font-medium text-red-600">
        {isForbidden ? 'You do not have permission to view this.' : 'Failed to load data'}
      </p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-lg bg-navy-900 text-white text-sm hover:bg-navy-800 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
