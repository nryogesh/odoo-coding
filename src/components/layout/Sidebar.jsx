import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Package,
  CalendarRange,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Users,
  Globe,
  LogOut,
  Tag,
  UserCheck,
  Settings,
  BarChart3,
  Layers,
} from 'lucide-react'

const ADMIN_NAV = [
  { to: '/', label: 'Executive Overview', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/users', label: 'Staff & Users', icon: UserCheck },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/plans', label: 'Plans', icon: CalendarRange },
  { to: '/templates', label: 'Quote Templates', icon: Layers },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/billing-simulator', label: 'Billing Engine', icon: FlaskConical },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/discounts-taxes', label: 'Discounts & Taxes', icon: Tag },
  { to: '/reports', label: 'Financial Reports', icon: BarChart3 },
  { to: '/audit', label: 'Audit & Security', icon: ShieldCheck },
  { to: '/ai-copilot', label: 'AI Finance Copilot', icon: Sparkles },
  { to: '/settings', label: 'System Settings', icon: Settings },
]

const STAFF_NAV = [
  { to: '/', label: 'Operations Center', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Customer Accounts', icon: Users },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/templates', label: 'Quote Templates', icon: Layers },
  { to: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/ai-copilot', label: 'Operations Copilot', icon: Sparkles },
]

const CUSTOMER_NAV = [
  { to: '/portal', label: 'My Account & Plans', icon: Globe, end: true },
  { to: '/invoices', label: 'My Invoices', icon: Receipt },
  { to: '/ai-copilot', label: 'Customer AI Copilot', icon: Sparkles },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const role = user?.role?.toUpperCase() || 'CUSTOMER'

  let nav = CUSTOMER_NAV
  let roleBadge = 'Customer'
  let roleBadgeColor = 'bg-slate-700 text-slate-200'

  if (role === 'ADMIN') {
    nav = ADMIN_NAV
    roleBadge = 'Administrator'
    roleBadgeColor = 'bg-purple-900/60 text-purple-200 border border-purple-500/30'
  } else if (role === 'STAFF') {
    nav = STAFF_NAV
    roleBadge = 'Operations Staff'
    roleBadgeColor = 'bg-blue-900/60 text-blue-200 border border-blue-500/30'
  }

  return (
    <aside className="w-64 shrink-0 bg-navy-900 text-slate-300 flex flex-col min-h-screen sticky top-0 shadow-xl">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 grid place-items-center text-white font-black text-lg shadow-md">
            S
          </span>
          <div className="overflow-hidden">
            <p className="text-white font-bold tracking-tight text-sm truncate">SubSecure AI</p>
            <p className="text-[11px] text-slate-400 truncate">Brightloop Billing</p>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${roleBadgeColor}`}>
              {roleBadge}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          {role === 'ADMIN' ? 'System Administration' : role === 'STAFF' ? 'Staff Operations' : 'Self Service'}
        </p>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500/20 text-white font-semibold border-l-2 border-brand-400'
                  : 'hover:bg-white/5 hover:text-white text-slate-300'
              }`
            }
          >
            <Icon size={16} className="shrink-0 text-slate-400 group-hover:text-white" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  )
}
