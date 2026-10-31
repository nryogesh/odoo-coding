import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Package, CalendarRange, FileText, Repeat, Receipt,
  CreditCard, FlaskConical, ShieldCheck, Sparkles, Users, Globe, LogOut,
} from 'lucide-react'

const ADMIN_STAFF_NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/plans', label: 'Plans', icon: CalendarRange },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/billing-simulator', label: 'Billing Simulator', icon: FlaskConical },
  { to: '/audit', label: 'Audit & Security', icon: ShieldCheck },
  { to: '/ai-copilot', label: 'AI Copilot', icon: Sparkles },
  { to: '/customers', label: 'Customers', icon: Users },
]

const CUSTOMER_NAV = [
  { to: '/portal', label: 'My Account', icon: Globe, end: true },
  { to: '/ai-copilot', label: 'AI Copilot', icon: Sparkles },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const isCustomer = user?.role === 'CUSTOMER'
  const nav = isCustomer ? CUSTOMER_NAV : ADMIN_STAFF_NAV

  return (
    <aside className="w-60 shrink-0 bg-navy-900 text-slate-300 flex flex-col min-h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-brand-500 grid place-items-center text-white font-bold">S</span>
          <div>
            <p className="text-white font-semibold leading-tight">SubSecure AI</p>
            <p className="text-[11px] text-slate-400">Brightloop Software</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-brand-500/20 text-white' : 'hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  )
}
