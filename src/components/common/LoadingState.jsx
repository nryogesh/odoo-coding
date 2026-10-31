export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
      <span className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      {label}
    </div>
  )
}
