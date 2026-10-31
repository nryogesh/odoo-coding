/**
 * In-browser API router connecting frontend services to the SubSecure AI Store.
 * Provides identical responses to the FastAPI backend specifications with strict RBAC.
 */

import { store } from './store'

const TOKEN_KEY = 'subsecure_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(t) {
  if (t) {
    localStorage.setItem(TOKEN_KEY, t)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function asArray(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  if (data && Array.isArray(data.data)) return data.data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.detail?.message || body?.detail || body?.message || `Request failed (${status})`)
    this.status = status
    this.body = body
  }
}

function getCurrentUser() {
  const token = getToken()
  if (!token) return null
  const user = store.data.users.find((u) => u.email === token || String(u.id) === token)
  return user || null
}

function requireAdmin(currentUser, action = 'perform this action') {
  if (!currentUser) throw new ApiError(401, { detail: 'Not authenticated' })
  if (currentUser.role !== 'ADMIN') {
    throw new ApiError(403, {
      detail: `Forbidden: Administrator privileges required to ${action}. Staff and Customers are restricted.`,
    })
  }
}

function requireStaffOrAdmin(currentUser, action = 'perform this action') {
  if (!currentUser) throw new ApiError(401, { detail: 'Not authenticated' })
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF') {
    throw new ApiError(403, {
      detail: `Forbidden: Internal team access required to ${action}.`,
    })
  }
}

function routeRequest(method, path, body = {}, params = {}) {
  const cleanPath = path.replace(/^\/api\/v1/, '').replace(/\/$/, '')
  const currentUser = getCurrentUser()

  // --- Auth Routes ---
  if (cleanPath === '/auth/login' && method === 'POST') {
    const { email, password } = body
    const user = store.data.users.find(
      (u) => u.email.toLowerCase() === (email || '').toLowerCase()
    )
    if (!user || user.password !== password) {
      throw new ApiError(401, { detail: 'Invalid email or password' })
    }
    const token = user.email
    setToken(token)
    return {
      access_token: token,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customer_id: user.customer_id,
      },
    }
  }

  if (cleanPath === '/auth/register' && method === 'POST') {
    const { name, email, password } = body
    if (store.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError(400, { detail: 'An account with this email already exists' })
    }
    const customerId = store.data.customers.length + 1
    const newCustomer = {
      id: customerId,
      name,
      email,
      company: name,
      region: 'IN-South',
      assigned_staff_id: 2,
    }
    store.data.customers.push(newCustomer)

    const newUserId = store.data.users.length + 1
    const newUser = {
      id: newUserId,
      name,
      email,
      password,
      role: 'CUSTOMER',
      customer_id: customerId,
      is_active: true,
      created_at: new Date().toISOString().slice(0, 10),
    }
    store.data.users.push(newUser)
    store.appendEvent({
      aggregateType: 'user',
      aggregateId: newUserId,
      eventType: 'UserCreated',
      payload: { email, role: 'CUSTOMER' },
      actorUserId: newUserId,
    })
    store.save()
    return {
      id: newUserId,
      name,
      email,
      role: 'CUSTOMER',
      customer_id: customerId,
    }
  }

  if (cleanPath === '/auth/me' && method === 'GET') {
    if (!currentUser) throw new ApiError(401, { detail: 'Not authenticated' })
    return {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      customer_id: currentUser.customer_id,
    }
  }

  if (cleanPath === '/auth/forgot-password' && method === 'POST') {
    const { email } = body
    const user = store.data.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase())
    if (!user) {
      // Security standard: don't reveal user existence
      return { success: true, message: 'If this email exists in our system, reset instructions have been generated.' }
    }
    return {
      success: true,
      message: `Password reset link and security verification token generated for ${user.email}.`,
      token: `rst_${Date.now()}`,
    }
  }

  if (cleanPath === '/auth/reset-password' && method === 'POST') {
    const { email, new_password } = body
    const user = store.data.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase())
    if (!user) {
      throw new ApiError(404, { detail: 'User account not found' })
    }
    if (!new_password || new_password.length < 6) {
      throw new ApiError(400, { detail: 'Password must be at least 6 characters' })
    }
    user.password = new_password
    store.appendEvent({
      aggregateType: 'user',
      aggregateId: user.id,
      eventType: 'PasswordReset',
      payload: { email: user.email },
      actorUserId: user.id,
    })
    store.save()
    return { success: true, message: 'Password has been successfully updated.' }
  }

  // Customer scoping helper
  const customerScope = currentUser?.role === 'CUSTOMER' ? currentUser.customer_id : null

  // --- Customers Directory & Details ---
  if (cleanPath === '/customers' && method === 'GET') {
    if (customerScope !== null) {
      // Customer can ONLY see their own customer profile
      return store.data.customers.filter((c) => c.id === customerScope)
    }
    // Staff & Admin
    let list = store.data.customers
    if (params.assigned_to_me && currentUser?.role === 'STAFF') {
      list = list.filter((c) => c.assigned_staff_id === currentUser.id)
    }
    return list.map((c) => {
      const assignedUser = store.data.users.find((u) => u.id === c.assigned_staff_id)
      const custSubs = store.data.subscriptions.filter((s) => s.customer_id === c.id)
      const activeSubs = custSubs.filter((s) => s.status === 'ACTIVE')
      return {
        ...c,
        assigned_staff_name: assignedUser ? assignedUser.name : 'Unassigned',
        subscriptions_count: custSubs.length,
        active_subscriptions_count: activeSubs.length,
      }
    })
  }

  const custDetailMatch = cleanPath.match(/^\/customers\/(\d+)$/)
  if (custDetailMatch && method === 'GET') {
    const cId = Number(custDetailMatch[1])
    if (customerScope !== null && customerScope !== cId) {
      throw new ApiError(403, { detail: 'Forbidden: Customers cannot access other customer profiles' })
    }
    const cust = store.data.customers.find((c) => c.id === cId)
    if (!cust) throw new ApiError(404, { detail: 'Customer not found' })
    const assignedUser = store.data.users.find((u) => u.id === cust.assigned_staff_id)
    return {
      ...cust,
      assigned_staff_name: assignedUser ? assignedUser.name : 'Unassigned',
    }
  }

  if (custDetailMatch && method === 'PATCH') {
    requireStaffOrAdmin(currentUser, 'update customer information')
    const cId = Number(custDetailMatch[1])
    const cust = store.data.customers.find((c) => c.id === cId)
    if (!cust) throw new ApiError(404, { detail: 'Customer not found' })

    if (body.assigned_staff_id !== undefined) {
      cust.assigned_staff_id = body.assigned_staff_id ? Number(body.assigned_staff_id) : null
    }
    if (body.name) cust.name = body.name
    if (body.company) cust.company = body.company
    if (body.email) cust.email = body.email
    if (body.region) cust.region = body.region

    store.appendEvent({
      aggregateType: 'customer',
      aggregateId: cust.id,
      eventType: 'CustomerUpdated',
      payload: { name: cust.name, assigned_staff_id: cust.assigned_staff_id },
      actorUserId: currentUser?.id,
    })
    store.save()
    return cust
  }

  // --- Users & Staff Management (ADMIN ONLY) ---
  if (cleanPath === '/users' && method === 'GET') {
    requireAdmin(currentUser, 'view system users and staff')
    return store.data.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      customer_id: u.customer_id,
      is_active: u.is_active ?? true,
      created_at: u.created_at || '2026-09-01',
    }))
  }

  if (cleanPath === '/users' && method === 'POST') {
    requireAdmin(currentUser, 'create staff or admin accounts')
    const { name, email, password, role } = body
    if (!name || !email || !password) {
      throw new ApiError(400, { detail: 'Name, email, and password are required' })
    }
    if (store.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError(400, { detail: 'A user with this email already exists' })
    }
    const newId = store.data.users.length > 0 ? Math.max(...store.data.users.map((u) => u.id)) + 1 : 1
    const newUser = {
      id: newId,
      name,
      email,
      password,
      role: (role || 'STAFF').toUpperCase(),
      customer_id: null,
      is_active: true,
      created_at: new Date().toISOString().slice(0, 10),
    }
    store.data.users.push(newUser)
    store.appendEvent({
      aggregateType: 'user',
      aggregateId: newId,
      eventType: 'UserCreated',
      payload: { email: newUser.email, role: newUser.role, name: newUser.name },
      actorUserId: currentUser?.id,
    })
    store.save()
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
    }
  }

  const userDetailMatch = cleanPath.match(/^\/users\/(\d+)$/)
  if (userDetailMatch && method === 'DELETE') {
    requireAdmin(currentUser, 'delete user accounts')
    const uId = Number(userDetailMatch[1])
    if (uId === 1) {
      throw new ApiError(400, { detail: 'Cannot delete primary root administrator account' })
    }
    if (currentUser.id === uId) {
      throw new ApiError(400, { detail: 'Cannot delete your own active administrator account' })
    }
    const idx = store.data.users.findIndex((u) => u.id === uId)
    if (idx === -1) throw new ApiError(404, { detail: 'User not found' })
    const deleted = store.data.users.splice(idx, 1)[0]
    store.appendEvent({
      aggregateType: 'user',
      aggregateId: uId,
      eventType: 'UserDeleted',
      payload: { email: deleted.email, role: deleted.role },
      actorUserId: currentUser?.id,
    })
    store.save()
    return { success: true, message: `User ${deleted.name} removed successfully` }
  }

  // --- Quotation Templates ---
  if (cleanPath === '/templates' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'view quotation templates')
    return store.data.templates || []
  }

  if (cleanPath === '/templates' && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'create quotation templates')
    const newId = (store.data.templates || []).length > 0 ? Math.max(...store.data.templates.map((t) => t.id)) + 1 : 1
    const newTemplate = {
      id: newId,
      name: body.name,
      description: body.description || '',
      plan_id: body.plan_id ? Number(body.plan_id) : null,
      product_id: body.product_id ? Number(body.product_id) : null,
      default_quantity: Number(body.default_quantity || 1),
      tax_percent: Number(body.tax_percent || 18),
      discount_percent: Number(body.discount_percent || 0),
      valid_days: Number(body.valid_days || 30),
      lines: body.lines || [],
    }
    if (!store.data.templates) store.data.templates = []
    store.data.templates.push(newTemplate)
    store.save()
    return newTemplate
  }

  const templateDetailMatch = cleanPath.match(/^\/templates\/(\d+)$/)
  if (templateDetailMatch && method === 'DELETE') {
    requireStaffOrAdmin(currentUser, 'delete quotation templates')
    const tId = Number(templateDetailMatch[1])
    const idx = (store.data.templates || []).findIndex((t) => t.id === tId)
    if (idx === -1) throw new ApiError(404, { detail: 'Template not found' })
    store.data.templates.splice(idx, 1)
    store.save()
    return { success: true }
  }

  // --- Discounts Management (ADMIN for modifications) ---
  if (cleanPath === '/discounts' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'view discount rules')
    return store.data.discountRules || []
  }

  if (cleanPath === '/discounts' && method === 'POST') {
    requireAdmin(currentUser, 'create and modify discount rules')
    const newId = (store.data.discountRules || []).length > 0 ? Math.max(...store.data.discountRules.map((d) => d.id)) + 1 : 1
    const newRule = {
      id: newId,
      name: body.name,
      description: body.description || '',
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      discount_type: (body.discount_type || 'PERCENTAGE').toUpperCase(),
      discount_value: Number(body.discount_value || 0),
      min_quantity: Number(body.min_quantity || 1),
      min_purchase: Number(body.min_purchase || 0),
      usage_count: 0,
      usage_limit: Number(body.usage_limit || 100),
    }
    if (!store.data.discountRules) store.data.discountRules = []
    store.data.discountRules.push(newRule)
    store.save()
    return newRule
  }

  const discountDetailMatch = cleanPath.match(/^\/discounts\/(\d+)$/)
  if (discountDetailMatch && method === 'DELETE') {
    requireAdmin(currentUser, 'delete discount rules')
    const dId = Number(discountDetailMatch[1])
    const idx = (store.data.discountRules || []).findIndex((d) => d.id === dId)
    if (idx === -1) throw new ApiError(404, { detail: 'Discount rule not found' })
    store.data.discountRules.splice(idx, 1)
    store.save()
    return { success: true }
  }

  // --- Taxes Management (ADMIN for modifications) ---
  if (cleanPath === '/taxes' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'view tax rules')
    return store.data.taxRules || []
  }

  if (cleanPath === '/taxes' && method === 'POST') {
    requireAdmin(currentUser, 'configure tax rules')
    const newId = (store.data.taxRules || []).length > 0 ? Math.max(...store.data.taxRules.map((t) => t.id)) + 1 : 1
    const newTax = {
      id: newId,
      name: body.name,
      region: body.region || 'IN',
      percentage: Number(body.percentage || 18),
      category: body.category || 'Standard Goods & Services Tax',
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    }
    if (!store.data.taxRules) store.data.taxRules = []
    store.data.taxRules.push(newTax)
    store.save()
    return newTax
  }

  const taxDetailMatch = cleanPath.match(/^\/taxes\/(\d+)$/)
  if (taxDetailMatch && method === 'DELETE') {
    requireAdmin(currentUser, 'delete tax rules')
    const tId = Number(taxDetailMatch[1])
    const idx = (store.data.taxRules || []).findIndex((t) => t.id === tId)
    if (idx === -1) throw new ApiError(404, { detail: 'Tax rule not found' })
    store.data.taxRules.splice(idx, 1)
    store.save()
    return { success: true }
  }

  // --- Customer Requests (Pause, Renewal, Plan Change) ---
  if (cleanPath === '/customer/requests' && method === 'GET') {
    if (customerScope !== null) {
      return (store.data.customerRequests || []).filter((r) => r.customer_id === customerScope)
    }
    return store.data.customerRequests || []
  }

  if (cleanPath === '/customer/requests' && method === 'POST') {
    const custId = customerScope || body.customer_id
    if (!custId) throw new ApiError(400, { detail: 'Customer identity required' })
    const cust = store.data.customers.find((c) => c.id === custId)
    const sub = store.data.subscriptions.find((s) => s.id === Number(body.subscription_id))

    const newId = (store.data.customerRequests || []).length > 0 ? Math.max(...store.data.customerRequests.map((r) => r.id)) + 1 : 1
    const newReq = {
      id: newId,
      customer_id: custId,
      customer_name: cust ? cust.name : `Customer #${custId}`,
      subscription_id: sub ? sub.id : null,
      subscription_number: sub ? sub.subscription_number : '—',
      request_type: (body.request_type || 'RENEWAL').toUpperCase(),
      notes: body.notes || 'Customer request submitted through portal',
      status: 'PENDING',
      created_at: new Date().toISOString().slice(0, 10),
    }
    if (!store.data.customerRequests) store.data.customerRequests = []
    store.data.customerRequests.push(newReq)
    store.appendEvent({
      aggregateType: 'customer',
      aggregateId: custId,
      eventType: 'CustomerRequestCreated',
      payload: { request_id: newId, request_type: newReq.request_type },
      actorUserId: currentUser?.id,
    })
    store.save()
    return newReq
  }

  const reqActionMatch = cleanPath.match(/^\/customer\/requests\/(\d+)\/action$/)
  if (reqActionMatch && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'approve or reject customer requests')
    const rId = Number(reqActionMatch[1])
    const req = (store.data.customerRequests || []).find((r) => r.id === rId)
    if (!req) throw new ApiError(404, { detail: 'Customer request not found' })

    const { action } = body
    if (action === 'approve') {
      req.status = 'APPROVED'
      // If renewal request, renew the subscription
      if (req.request_type === 'RENEWAL' && req.subscription_id) {
        const sub = store.data.subscriptions.find((s) => s.id === req.subscription_id)
        if (sub) {
          const exp = sub.expiry_date ? new Date(sub.expiry_date) : new Date()
          exp.setFullYear(exp.getFullYear() + 1)
          sub.expiry_date = exp.toISOString().slice(0, 10)
          sub.status = 'ACTIVE'
        }
      } else if (req.request_type === 'PAUSE' && req.subscription_id) {
        const sub = store.data.subscriptions.find((s) => s.id === req.subscription_id)
        if (sub) sub.status = 'PAUSED'
      }
    } else if (action === 'reject') {
      req.status = 'REJECTED'
    } else {
      throw new ApiError(400, { detail: 'Unknown action' })
    }
    store.save()
    return req
  }

  // --- System Settings (ADMIN ONLY for modifications) ---
  if (cleanPath === '/settings' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'view system configuration')
    return store.data.settings
  }

  if (cleanPath === '/settings' && (method === 'POST' || method === 'PUT')) {
    requireAdmin(currentUser, 'modify system configurations and billing schedules')
    store.data.settings = {
      ...store.data.settings,
      ...body,
    }
    store.save()
    return store.data.settings
  }

  // --- Reports & Export ---
  if (cleanPath === '/reports' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'access business intelligence reports')
    const plansReport = store.data.plans.map((p) => {
      const activeCount = store.data.subscriptions.filter((s) => s.plan_id === p.id && s.status === 'ACTIVE').length
      const mrr = activeCount * p.price
      return {
        plan_id: p.id,
        plan_name: p.name,
        price: p.price,
        interval: p.billing_interval,
        active_subscriptions: activeCount,
        mrr,
        arr: mrr * 12,
      }
    })

    const overdueAgingReport = store.data.invoices
      .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
      .map((inv) => {
        const cust = store.data.customers.find((c) => c.id === inv.customer_id)
        const daysPastDue = Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000))
        return {
          invoice_number: inv.invoice_number,
          customer_name: cust ? cust.name : `Customer #${inv.customer_id}`,
          due_date: inv.due_date,
          days_past_due: daysPastDue,
          total: inv.total,
          balance: inv.balance !== undefined ? inv.balance : inv.total - (inv.paid_amount || 0),
          bucket: daysPastDue > 60 ? '60+ days' : daysPastDue > 30 ? '31-60 days' : daysPastDue > 0 ? '1-30 days' : 'Current',
        }
      })

    return {
      plans_breakdown: plansReport,
      overdue_aging: overdueAgingReport,
      generated_at: new Date().toISOString(),
    }
  }

  // --- Products ---
  if (cleanPath === '/products' && method === 'GET') {
    return store.data.products.map((p) => ({
      ...p,
      product_type: p.product_type,
      is_active: p.is_active,
    }))
  }

  if (cleanPath === '/products' && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'create products')
    const newId = store.data.products.length > 0 ? Math.max(...store.data.products.map((p) => p.id)) + 1 : 1
    const variants = (body.variants || []).map((v, i) => ({
      id: i + 1,
      name: v.name,
      price_adjustment: Number(v.price_adjustment || 0),
    }))
    const newProduct = {
      id: newId,
      name: body.name,
      product_type: (body.product_type || 'SERVICE').toUpperCase(),
      sales_price: Number(body.sales_price || 0),
      cost_price: Number(body.cost_price || 0),
      notes: body.notes || null,
      is_active: body.active !== undefined ? Boolean(body.active) : true,
      variants,
    }
    store.data.products.push(newProduct)
    store.appendEvent({
      aggregateType: 'product',
      aggregateId: newId,
      eventType: 'ProductCreated',
      payload: { name: body.name, sales_price: body.sales_price },
      actorUserId: currentUser?.id,
    })
    store.save()
    return newProduct
  }

  // --- Plans ---
  if (cleanPath === '/plans' && method === 'GET') {
    return store.data.plans.map((p) => {
      const prod = store.data.products.find((pr) => pr.id === p.product_id)
      return {
        ...p,
        product_name: prod ? prod.name : `Product #${p.product_id}`,
        is_active: p.is_active,
        minimum_quantity: p.minimum_quantity,
      }
    })
  }

  if (cleanPath === '/plans' && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'create plans')
    const newId = store.data.plans.length > 0 ? Math.max(...store.data.plans.map((p) => p.id)) + 1 : 1
    const newPlan = {
      id: newId,
      name: body.name,
      product_id: Number(body.product_id),
      price: Number(body.price),
      billing_interval: (body.billing_interval || 'MONTHLY').toUpperCase(),
      minimum_quantity: Number(body.minimum_quantity || 1),
      available_from: body.available_from || null,
      available_until: body.available_until || null,
      auto_close: Boolean(body.auto_close),
      allow_early_close: Boolean(body.allow_early_close),
      allow_pause: body.allow_pause !== undefined ? Boolean(body.allow_pause) : true,
      allow_renewal: body.allow_renewal !== undefined ? Boolean(body.allow_renewal) : true,
      is_active: body.active !== undefined ? Boolean(body.active) : true,
    }
    store.data.plans.push(newPlan)
    store.appendEvent({
      aggregateType: 'plan',
      aggregateId: newId,
      eventType: 'PlanCreated',
      payload: { name: body.name, price: body.price, interval: newPlan.billing_interval },
      actorUserId: currentUser?.id,
    })
    store.save()
    return newPlan
  }

  // --- Quotations ---
  if (cleanPath === '/quotations' && method === 'GET') {
    if (customerScope !== null) {
      return store.data.quotations
        .filter((q) => q.customer_id === customerScope)
        .map((q) => {
          const cust = store.data.customers.find((c) => c.id === q.customer_id)
          return {
            ...q,
            customer_name: cust ? cust.name : `Customer #${q.customer_id}`,
          }
        })
    }
    return store.data.quotations.map((q) => {
      const cust = store.data.customers.find((c) => c.id === q.customer_id)
      return {
        ...q,
        customer_name: cust ? cust.name : `Customer #${q.customer_id}`,
      }
    })
  }

  if (cleanPath === '/quotations' && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'create quotations')
    const newId = store.data.quotations.length > 0 ? Math.max(...store.data.quotations.map((q) => q.id)) + 1 : 1
    const qNumber = `QUO-${1000 + newId}`
    const plan = store.data.plans.find((p) => p.id === body.plan_id)
    const product = store.data.products.find((p) => p.id === (body.lines?.[0]?.product_id || plan?.product_id))

    const unitPrice = plan ? plan.price : product ? product.sales_price : 0
    const qty = Number(body.lines?.[0]?.quantity || 1)
    const subtotal = unitPrice * qty
    const discount = subtotal * (Number(body.discount_percent || 0) / 100)
    const taxable = subtotal - discount
    const tax = taxable * (Number(body.tax_percent || 18) / 100)
    const total = Math.round(taxable + tax)

    const validUntil = body.valid_until || new Date(Date.now() + (body.valid_days || 30) * 86400000).toISOString().slice(0, 10)

    const newQuotation = {
      id: newId,
      quotation_number: qNumber,
      customer_id: Number(body.customer_id),
      plan_id: body.plan_id ? Number(body.plan_id) : null,
      valid_until: validUntil,
      tax_percent: Number(body.tax_percent || 18),
      discount_percent: Number(body.discount_percent || 0),
      status: 'QUOTATION',
      subtotal,
      discount_total: discount,
      tax_total: tax,
      total,
      assigned_staff_id: currentUser?.id || 2,
      lines: [
        {
          id: 1,
          product_id: product ? product.id : 1,
          quantity: qty,
          unit_price: unitPrice,
          product_name: product ? product.name : 'Product',
        },
      ],
    }

    store.data.quotations.push(newQuotation)
    store.appendEvent({
      aggregateType: 'quotation',
      aggregateId: newId,
      eventType: 'QuotationCreated',
      payload: { quotation_number: qNumber, customer_id: body.customer_id, total },
      actorUserId: currentUser?.id,
    })
    store.save()
    return newQuotation
  }

  const quoTransitionMatch = cleanPath.match(/^\/quotations\/(\d+)\/transition$/)
  if (quoTransitionMatch && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'transition quotations')
    const qId = Number(quoTransitionMatch[1])
    const quotation = store.data.quotations.find((q) => q.id === qId)
    if (!quotation) throw new ApiError(404, { detail: 'Quotation not found' })

    const { action } = body
    if (action === 'send') quotation.status = 'QUOTATION'
    else if (action === 'confirm') quotation.status = 'CONFIRMED'
    else if (action === 'close') quotation.status = 'CLOSED'
    else if (action === 'convert') {
      quotation.status = 'ACTIVE'
      const count = store.data.subscriptions.length
      const newSubId = count > 0 ? Math.max(...store.data.subscriptions.map((s) => s.id)) + 1 : 1
      const subNumber = `SUB-${1000 + newSubId}`
      const todayStr = new Date().toISOString().slice(0, 10)
      const newSub = {
        id: newSubId,
        subscription_number: subNumber,
        customer_id: quotation.customer_id,
        plan_id: quotation.plan_id,
        start_date: todayStr,
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        next_billing_date: todayStr,
        payment_terms: 'net_15',
        status: 'CONFIRMED',
        created_at: todayStr,
        lines: quotation.lines.map((l, i) => ({
          id: i + 1,
          product_id: l.product_id,
          variant_id: null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          product_name: l.product_name,
        })),
      }
      store.data.subscriptions.push(newSub)
      store.appendEvent({
        aggregateType: 'subscription',
        aggregateId: newSubId,
        eventType: 'SubscriptionCreated',
        payload: { subscription_number: subNumber, from_quotation: quotation.quotation_number },
        actorUserId: currentUser?.id,
      })
    }
    store.save()
    return quotation
  }

  // --- Subscriptions ---
  if (cleanPath === '/subscriptions' && method === 'GET') {
    let list = store.data.subscriptions
    if (customerScope !== null) {
      list = list.filter((s) => s.customer_id === customerScope)
    }
    if (params.status) {
      list = list.filter((s) => s.status.toUpperCase() === params.status.toUpperCase())
    }
    if (params.customer_id) {
      list = list.filter((s) => String(s.customer_id) === String(params.customer_id))
    }
    return list.map((s) => {
      const cust = store.data.customers.find((c) => c.id === s.customer_id)
      const plan = store.data.plans.find((p) => p.id === s.plan_id)
      const amount = (s.lines || []).reduce((acc, l) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
      return {
        ...s,
        customer_name: cust ? cust.name : `Customer #${s.customer_id}`,
        plan_name: plan ? plan.name : `Plan #${s.plan_id}`,
        billing_interval: plan ? plan.billing_interval.toLowerCase() : 'monthly',
        total: amount,
        amount,
      }
    })
  }

  const subDetailMatch = cleanPath.match(/^\/subscriptions\/(\d+)$/)
  if (subDetailMatch && method === 'GET') {
    const sId = Number(subDetailMatch[1])
    const sub = store.data.subscriptions.find((s) => s.id === sId)
    if (!sub) throw new ApiError(404, { detail: 'Subscription not found' })
    if (customerScope !== null && sub.customer_id !== customerScope) {
      throw new ApiError(403, { detail: 'Forbidden: Customers cannot view other customer subscriptions' })
    }
    const cust = store.data.customers.find((c) => c.id === sub.customer_id)
    const plan = store.data.plans.find((p) => p.id === sub.plan_id)
    const amount = (sub.lines || []).reduce((acc, l) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
    return {
      ...sub,
      customer_name: cust ? cust.name : `Customer #${sub.customer_id}`,
      plan_name: plan ? plan.name : `Plan #${sub.plan_id}`,
      billing_interval: plan ? plan.billing_interval.toLowerCase() : 'monthly',
      total: amount,
      amount,
    }
  }

  if (cleanPath === '/subscriptions' && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'create subscriptions directly')
    const newId = store.data.subscriptions.length > 0 ? Math.max(...store.data.subscriptions.map((s) => s.id)) + 1 : 1
    const subNumber = `SUB-${1000 + newId}`
    const todayStr = new Date().toISOString().slice(0, 10)
    const plan = store.data.plans.find((p) => p.id === Number(body.plan_id))
    const prod = store.data.products.find((p) => p.id === plan?.product_id)

    const newSub = {
      id: newId,
      subscription_number: subNumber,
      customer_id: Number(body.customer_id),
      plan_id: Number(body.plan_id),
      start_date: body.start_date || todayStr,
      expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      next_billing_date: body.start_date || todayStr,
      payment_terms: body.payment_terms || 'net_15',
      status: 'CONFIRMED',
      created_at: todayStr,
      lines: [
        {
          id: 1,
          product_id: plan?.product_id || 1,
          quantity: Number(body.quantity || 1),
          unit_price: plan?.price || 0,
          product_name: prod ? prod.name : 'Subscription Product',
        },
      ],
    }

    store.data.subscriptions.push(newSub)
    store.appendEvent({
      aggregateType: 'subscription',
      aggregateId: newId,
      eventType: 'SubscriptionCreated',
      payload: { subscription_number: subNumber, customer_id: body.customer_id, plan_id: body.plan_id },
      actorUserId: currentUser?.id,
    })
    store.save()
    return newSub
  }

  const subTransitionMatch = cleanPath.match(/^\/subscriptions\/(\d+)\/transition$/)
  if (subTransitionMatch && method === 'POST') {
    const sId = Number(subTransitionMatch[1])
    const sub = store.data.subscriptions.find((s) => s.id === sId)
    if (!sub) throw new ApiError(404, { detail: 'Subscription not found' })

    if (customerScope !== null && sub.customer_id !== customerScope) {
      throw new ApiError(403, { detail: 'Forbidden: Customers cannot transition other subscriptions' })
    }

    const plan = store.data.plans.find((p) => p.id === sub.plan_id)
    const action = String(body.action || '').toLowerCase()
    const oldStatus = sub.status

    if (action === 'confirm') {
      sub.status = 'CONFIRMED'
    } else if (action === 'activate') {
      sub.status = 'ACTIVE'
      if (!sub.next_billing_date) sub.next_billing_date = sub.start_date
    } else if (action === 'pause') {
      if (plan && !plan.allow_pause) throw new ApiError(400, { detail: 'Plan does not allow pausing' })
      sub.status = 'PAUSED'
    } else if (action === 'resume') {
      sub.status = 'ACTIVE'
    } else if (action === 'renew') {
      if (plan && !plan.allow_renewal) throw new ApiError(400, { detail: 'Plan does not allow renewal' })
      const exp = sub.expiry_date ? new Date(sub.expiry_date) : new Date()
      exp.setFullYear(exp.getFullYear() + 1)
      sub.expiry_date = exp.toISOString().slice(0, 10)
      sub.status = 'ACTIVE'
    } else if (action === 'close') {
      if (plan && !plan.allow_early_close) {
        const today = new Date().toISOString().slice(0, 10)
        if (sub.expiry_date && today < sub.expiry_date) {
          throw new ApiError(400, { detail: 'Plan does not allow early closure' })
        }
      }
      sub.status = 'CLOSED'
    } else {
      throw new ApiError(400, { detail: `Unknown action ${action}` })
    }

    store.appendEvent({
      aggregateType: 'subscription',
      aggregateId: sub.id,
      eventType: action === 'resume' ? 'SubscriptionResumed' : action === 'renew' ? 'SubscriptionRenewed' : `Subscription${sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}`,
      payload: { from: oldStatus, to: sub.status, subscription_number: sub.subscription_number },
      actorUserId: currentUser?.id,
    })
    store.save()
    return sub
  }

  const subEventsMatch = cleanPath.match(/^\/subscriptions\/(\d+)\/events$/)
  if (subEventsMatch && method === 'GET') {
    const sId = String(subEventsMatch[1])
    return store.data.auditEvents
      .filter((e) => e.aggregate_type === 'subscription' && String(e.aggregate_id) === sId)
      .sort((a, b) => a.sequence_num - b.sequence_num)
  }

  const subStateAtMatch = cleanPath.match(/^\/subscriptions\/(\d+)\/state-at$/)
  if (subStateAtMatch && method === 'GET') {
    const sId = String(subStateAtMatch[1])
    const at = params.at || new Date().toISOString()
    const events = store.data.auditEvents
      .filter((e) => e.aggregate_type === 'subscription' && String(e.aggregate_id) === sId)
      .filter((e) => e.timestamp <= at)
      .sort((a, b) => a.sequence_num - b.sequence_num)

    let status = 'DRAFT'
    for (const ev of events) {
      try {
        const p = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload
        if (p.to) status = p.to
        if (ev.event_type === 'SubscriptionRenewed') status = 'ACTIVE'
      } catch {
        // ignore
      }
    }
    return {
      subscription_id: Number(sId),
      as_of: at,
      status,
      events_replayed: events.length,
      note: "State reconstructed by replaying this subscription's audit events up to requested timestamp.",
    }
  }

  // --- Billing Rehearsal & Execution (ADMIN ONLY for execution) ---
  if (cleanPath === '/billing/simulate' && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'simulate billing rehearsals')
    return store.simulateBilling(body.billing_period_key)
  }

  if (cleanPath === '/billing/execute' && method === 'POST') {
    requireAdmin(currentUser, 'execute live billing runs')
    return store.executeBilling(body.billing_period_key, currentUser?.id || 1)
  }

  // --- Invoices ---
  if (cleanPath === '/invoices' && method === 'GET') {
    let list = store.data.invoices
    if (customerScope !== null) {
      list = list.filter((i) => i.customer_id === customerScope)
    }
    return list.map((i) => {
      const cust = store.data.customers.find((c) => c.id === i.customer_id)
      const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
      return {
        ...i,
        customer_name: cust ? cust.name : `Customer #${i.customer_id}`,
        balance: Math.max(0, bal),
        amount_paid: i.paid_amount || 0,
      }
    })
  }

  const invoiceDetailMatch = cleanPath.match(/^\/invoices\/(\d+)$/)
  if (invoiceDetailMatch && method === 'GET') {
    const iId = Number(invoiceDetailMatch[1])
    const inv = store.data.invoices.find((i) => i.id === iId)
    if (!inv) throw new ApiError(404, { detail: 'Invoice not found' })
    if (customerScope !== null && inv.customer_id !== customerScope) {
      throw new ApiError(403, { detail: 'Forbidden: Customers cannot access other customer invoices' })
    }
    const cust = store.data.customers.find((c) => c.id === inv.customer_id)
    const bal = inv.balance !== undefined ? inv.balance : inv.total - (inv.paid_amount || 0)
    return {
      ...inv,
      customer_name: cust ? cust.name : `Customer #${inv.customer_id}`,
      customer_email: cust ? cust.email : '',
      customer_company: cust ? cust.company : '',
      customer_region: cust ? cust.region : '',
      balance: Math.max(0, bal),
      amount_paid: inv.paid_amount || 0,
    }
  }

  const invoiceConfirmMatch = cleanPath.match(/^\/invoices\/(\d+)\/confirm$/)
  if (invoiceConfirmMatch && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'confirm invoices')
    const iId = Number(invoiceConfirmMatch[1])
    const inv = store.data.invoices.find((i) => i.id === iId)
    if (!inv) throw new ApiError(404, { detail: 'Invoice not found' })
    inv.status = 'CONFIRMED'
    store.appendEvent({
      aggregateType: 'invoice',
      aggregateId: inv.id,
      eventType: 'InvoiceConfirmed',
      payload: { invoice_number: inv.invoice_number, status: 'CONFIRMED' },
      actorUserId: currentUser?.id,
    })
    store.save()
    return inv
  }

  const invoiceCancelMatch = cleanPath.match(/^\/invoices\/(\d+)\/cancel$/)
  if (invoiceCancelMatch && method === 'POST') {
    requireStaffOrAdmin(currentUser, 'cancel invoices')
    const iId = Number(invoiceCancelMatch[1])
    const inv = store.data.invoices.find((i) => i.id === iId)
    if (!inv) throw new ApiError(404, { detail: 'Invoice not found' })
    inv.status = 'CANCELLED'
    store.appendEvent({
      aggregateType: 'invoice',
      aggregateId: inv.id,
      eventType: 'InvoiceCancelled',
      payload: { invoice_number: inv.invoice_number, status: 'CANCELLED' },
      actorUserId: currentUser?.id,
    })
    store.save()
    return inv
  }

  const invoiceBalanceMatch = cleanPath.match(/^\/invoices\/(\d+)\/balance$/)
  if (invoiceBalanceMatch && method === 'GET') {
    const iId = Number(invoiceBalanceMatch[1])
    const inv = store.data.invoices.find((i) => i.id === iId)
    if (!inv) throw new ApiError(404, { detail: 'Invoice not found' })
    if (customerScope !== null && inv.customer_id !== customerScope) {
      throw new ApiError(403, { detail: 'Forbidden' })
    }
    const bal = inv.balance !== undefined ? inv.balance : inv.total - (inv.paid_amount || 0)
    return {
      invoice_id: inv.id,
      balance: Math.max(0, bal),
      outstanding: Math.max(0, bal),
      total: inv.total,
      paid_amount: inv.paid_amount || 0,
      status: inv.status,
    }
  }

  // --- Payments ---
  if (cleanPath === '/payments' && method === 'GET') {
    let list = store.data.payments
    if (customerScope !== null) {
      const custInvoiceIds = store.data.invoices.filter((i) => i.customer_id === customerScope).map((i) => i.id)
      list = list.filter((p) => custInvoiceIds.includes(p.invoice_id))
    }
    return list.map((p) => {
      const inv = store.data.invoices.find((i) => i.id === p.invoice_id)
      const cust = inv ? store.data.customers.find((c) => c.id === inv.customer_id) : null
      return {
        ...p,
        invoice_number: inv ? inv.invoice_number : `INV-${p.invoice_id}`,
        customer_name: cust ? cust.name : '—',
      }
    })
  }

  if (cleanPath === '/payments' && method === 'POST') {
    const inv = store.data.invoices.find((i) => i.id === Number(body.invoice_id))
    if (!inv) throw new ApiError(404, { detail: 'Invoice not found' })

    if (customerScope !== null && inv.customer_id !== customerScope) {
      throw new ApiError(403, { detail: 'Forbidden: Customers cannot pay for other accounts' })
    }

    const amount = Number(body.amount)
    const currentPaid = Number(inv.paid_amount || 0)
    const currentBal = inv.balance !== undefined ? inv.balance : inv.total - currentPaid

    if (amount > currentBal) {
      throw new ApiError(400, { detail: `Payment amount ₹${amount} exceeds outstanding balance ₹${currentBal}` })
    }

    const newPaymentId = store.data.payments.length > 0 ? Math.max(...store.data.payments.map((p) => p.id)) + 1 : 1
    const newPayment = {
      id: newPaymentId,
      invoice_id: inv.id,
      amount,
      method: body.method || 'upi',
      payment_date: body.payment_date || new Date().toISOString().slice(0, 10),
      reference: body.reference || `TXN-${Date.now()}`,
      note: body.note || null,
      created_by: currentUser?.id || 1,
    }
    store.data.payments.push(newPayment)

    inv.paid_amount = currentPaid + amount
    inv.balance = currentBal - amount
    if (inv.balance <= 0) {
      inv.status = 'PAID'
    }

    store.appendEvent({
      aggregateType: 'invoice',
      aggregateId: inv.id,
      eventType: 'PaymentReceived',
      payload: {
        invoice_number: inv.invoice_number,
        amount: String(amount),
        invoice_now_paid: inv.status === 'PAID',
      },
      actorUserId: currentUser?.id,
    })
    store.save()

    return {
      ...newPayment,
      invoice_status: inv.status,
      balance: inv.balance,
    }
  }

  // --- Analytics & Staff Dashboard ---
  if (cleanPath === '/analytics/dashboard' && method === 'GET') {
    requireAdmin(currentUser, 'access executive business dashboard')
    return store.getDashboardMetrics()
  }

  if (cleanPath === '/analytics/staff-dashboard' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'access staff operational dashboard')
    return store.getStaffDashboardMetrics(currentUser?.id)
  }

  if (cleanPath === '/analytics/mrr' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'view recurring revenue breakdown')
    return store.getMRRBreakdown()
  }

  if (cleanPath === '/analytics/churn-risk' && method === 'GET') {
    requireStaffOrAdmin(currentUser, 'view churn risk signals')
    return store.getChurnRiskList(customerScope)
  }

  // --- Audit & Security (Admin / restricted Staff) ---
  if (cleanPath === '/audit/events' && method === 'GET') {
    requireAdmin(currentUser, 'inspect the cryptographic audit ledger')
    const limit = Number(params.limit || 50)
    return [...store.data.auditEvents].reverse().slice(0, limit)
  }

  if (cleanPath === '/audit/verify' && method === 'POST') {
    requireAdmin(currentUser, 'run SHA-256 ledger integrity verification')
    return store.verifyAuditChain()
  }

  if (cleanPath === '/security/alerts' && method === 'GET') {
    requireAdmin(currentUser, 'view security alerts')
    return store.data.securityAlerts || []
  }

  // --- AI Assistant (Customer, Staff, Admin) ---
  if (cleanPath === '/assistant/query' && method === 'POST') {
    if (!currentUser) throw new ApiError(401, { detail: 'Not authenticated' })
    return store.answerQuestion(body.question, currentUser)
  }

  throw new ApiError(404, { detail: `Route ${method} ${cleanPath} not found` })
}

export const api = {
  get: async (path, params) => routeRequest('GET', path, undefined, params),
  post: async (path, body) => routeRequest('POST', path, body, undefined),
  put: async (path, body) => routeRequest('PUT', path, body, undefined),
  patch: async (path, body) => routeRequest('PATCH', path, body, undefined),
  delete: async (path) => routeRequest('DELETE', path, undefined, undefined),
}
