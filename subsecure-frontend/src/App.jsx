import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './routes/AppRoutes'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Plans from './pages/Plans'
import Quotations from './pages/Quotations'
import Subscriptions from './pages/Subscriptions'
import SubscriptionDetail from './pages/SubscriptionDetail'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import BillingSimulator from './pages/BillingSimulator'
import AuditCenter from './pages/AuditCenter'
import AIAssistant from './pages/AIAssistant'
import Customers from './pages/Customers'
import CustomerPortal from './pages/CustomerPortal'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route path="/portal" element={<CustomerPortal />} />
        <Route path="/ai-copilot" element={<AIAssistant />} />
      </Route>

      <Route element={<RequireAuth roles={['ADMIN', 'STAFF']} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/billing-simulator" element={<BillingSimulator />} />
        <Route path="/audit" element={<AuditCenter />} />
        <Route path="/customers" element={<Customers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
