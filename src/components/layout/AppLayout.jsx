import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const TITLES = {
  '/': ['Overview', 'Revenue, risk and activity at a glance'],
  '/products': ['Products', 'Catalog and variants'],
  '/plans': ['Plans', 'Recurring pricing and billing frequency'],
  '/quotations': ['Quotations', 'Offers, validity and conversion'],
  '/subscriptions': ['Subscriptions', 'Lifecycle management'],
  '/invoices': ['Invoices', 'Billing periods, balances and status'],
  '/payments': ['Payments', 'Recorded payments and reconciliation'],
  '/billing-simulator': ['Billing Day Rehearsal', 'Preview invoices before executing a billing run'],
  '/audit': ['Audit & Security Center', 'SHA-256 hash-chain verification'],
  '/ai-copilot': ['AI Finance Copilot', 'Ask questions in plain language'],
  '/customers': ['Customers', 'Accounts and subscriptions'],
  '/portal': ['My Account', 'Your subscriptions, invoices and payments'],
}

export default function AppLayout({ children }) {
  const { pathname } = useLocation()
  const [title, subtitle] = TITLES[pathname] || ['SubSecure AI', '']
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
