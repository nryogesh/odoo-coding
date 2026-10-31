export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

export function daysUntil(value) {
  if (!value) return null
  return Math.ceil((new Date(value) - Date.now()) / 86400000)
}
