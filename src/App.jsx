import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import RequireAuth from './routes/AppRoutes'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StaffDashboard from './pages/StaffDashboard'
import Products from './pages/Products'
import Plans from './pages/Plans'
import Templates from './pages/Templates'
import Quotations from './pages/Quotations'
import Subscriptions from './pages/Subscriptions'
import SubscriptionDetail from './pages/SubscriptionDetail'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import DiscountsAndTaxes from './pages/DiscountsAndTaxes'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import BillingSimulator from './pages/BillingSimulator'
import AuditCenter from './pages/AuditCenter'
import AIAssistant from './pages/AIAssistant'
import Customers from './pages/Customers'
import CustomerPortal from './pages/CustomerPortal'

function HomeDispatcher() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'CUSTOMER') return <Navigate to="/portal" replace />
  if (user.role === 'STAFF') return <StaffDashboard />
  return <Dashboard />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Authenticated Customer Routes */}
      <Route element={<RequireAuth />}>
        <Route path="/portal" element={<CustomerPortal />} />
        <Route path="/ai-copilot" element={<AIAssistant />} />
      </Route>

      {/* Staff & Admin Routes */}
      <Route element={<RequireAuth roles={['ADMIN', 'STAFF']} />}>
        <Route path="/" element={<HomeDispatcher />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/products" element={<Products />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/reports" element={<Reports />} />
      </Route>

      {/* Admin Only Routes */}
      <Route element={<RequireAuth roles={['ADMIN']} />}>
        <Route path="/admin-dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/discounts-taxes" element={<DiscountsAndTaxes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing-simulator" element={<BillingSimulator />} />
        <Route path="/audit" element={<AuditCenter />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
