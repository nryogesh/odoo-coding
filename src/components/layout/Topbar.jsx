import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../common/StatusBadge'

export default function Topbar({ title, subtitle }) {
  const { user } = useAuth()
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-navy-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-navy-800 transition-colors" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-semibold">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-navy-900 leading-tight">{user?.name}</p>
            <StatusBadge status={user?.role} className="mt-0.5" />
          </div>
        </div>
      </div>
    </header>
  )
}
