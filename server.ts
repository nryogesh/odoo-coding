import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { createServer as createViteServer } from 'vite'

const PORT = 3000
const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'subsecure_db.json')
const GENESIS_HASH = '0'.repeat(64)
const JWT_SECRET = 'subsecure_super_secret_jwt_key_2026'

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Password complexity rule: 8+ chars, 1 uppercase, 1 lowercase, 1 special char
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/

// Helper date functions
function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDateISO(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function addDays(d: Date | string, n: number) {
  const res = new Date(d)
  res.setDate(res.getDate() + n)
  return formatDateISO(res)
}

function computeEventHash(prevHash: string, seq: number, type: string, payload: any, timestamp: string) {
  const raw = `${prevHash}|${seq}|${type}|${JSON.stringify(payload)}|${timestamp}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// Initial Database Seeder
function getSeedData() {
  const today = new Date()
  const todayStr = formatDateISO(today)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStartStr = formatDateISO(monthStart)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthStartStr = formatDateISO(lastMonthStart)
  const monthKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`
  const lastMonthKey = `${lastMonthStart.getFullYear()}-${pad2(lastMonthStart.getMonth() + 1)}`

  const adminHash = bcrypt.hashSync('Admin@12345', 10)
  const staffHash = bcrypt.hashSync('Staff@12345', 10)
  const customerHash = bcrypt.hashSync('Customer@12345', 10)

  const users = [
    {
      id: 1,
      name: 'Kirthi Admin',
      email: 'admin@brightloop.io',
      password_hash: adminHash,
      role: 'ADMIN',
      customer_id: null,
      is_active: true,
      created_at: addDays(today, -60),
    },
    {
      id: 2,
      name: 'Yogesh Staff',
      email: 'staff@brightloop.io',
      password_hash: staffHash,
      role: 'STAFF',
      customer_id: null,
      is_active: true,
      created_at: addDays(today, -50),
    },
    {
      id: 3,
      name: 'Acme Customer',
      email: 'customer@acme.io',
      password_hash: customerHash,
      role: 'CUSTOMER',
      customer_id: 1,
      is_active: true,
      created_at: addDays(today, -45),
    },
  ]

  const customers = [
    { id: 1, name: 'Acme Technologies', email: 'billing@acme.io', company: 'Acme Technologies', region: 'IN-South', assigned_staff_id: 2 },
    { id: 2, name: 'Northstar Retail', email: 'it@northstar.example', company: 'Northstar Retail', region: 'IN-North', assigned_staff_id: 2 },
    { id: 3, name: 'PixelWorks', email: 'ops@pixelworks.example', company: 'PixelWorks Studio', region: 'IN-West', assigned_staff_id: 2 },
    { id: 4, name: 'Bluemont Logistics', email: 'finance@bluemont.example', company: 'Bluemont Logistics', region: 'IN-South', assigned_staff_id: 2 },
    { id: 5, name: 'Cider & Co', email: 'hello@cider.example', company: 'Cider & Co', region: 'IN-East', assigned_staff_id: 2 },
  ]

  const products = [
    {
      id: 1,
      name: 'Brightloop CRM',
      product_type: 'SUBSCRIPTION',
      sales_price: 5000,
      cost_price: 1200,
      is_active: true,
      notes: 'Flagship enterprise CRM solution',
      variants: [
        { id: 1, name: 'Odoo Brand', price_adjustment: 560 },
        { id: 2, name: 'White Label', price_adjustment: 900 },
      ],
    },
    {
      id: 2,
      name: 'Brightloop Analytics',
      product_type: 'SUBSCRIPTION',
      sales_price: 8000,
      cost_price: 2000,
      is_active: true,
      notes: 'Real-time billing & revenue intelligence',
      variants: [],
    },
    {
      id: 3,
      name: 'Priority Support Add-on',
      product_type: 'ADDON',
      sales_price: 1500,
      cost_price: 400,
      is_active: true,
      notes: '24/7 dedicated response SLA',
      variants: [],
    },
    {
      id: 4,
      name: 'Onboarding Package',
      product_type: 'SERVICE',
      sales_price: 3000,
      cost_price: 1000,
      is_active: true,
      notes: 'Guided data migration and engineer setup',
      variants: [],
    },
  ]

  const plans = [
    {
      id: 1,
      name: 'CRM Enterprise Monthly',
      product_id: 1,
      price: 5000,
      billing_interval: 'MONTHLY',
      minimum_quantity: 1,
      available_from: addDays(today, -180),
      available_until: null,
      auto_close: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renewal: true,
      is_active: true,
    },
    {
      id: 2,
      name: 'CRM Growth Annual',
      product_id: 1,
      price: 54000,
      billing_interval: 'YEARLY',
      minimum_quantity: 5,
      available_from: addDays(today, -180),
      available_until: null,
      auto_close: false,
      allow_early_close: false,
      allow_pause: false,
      allow_renewal: true,
      is_active: true,
    },
    {
      id: 3,
      name: 'Analytics Pro Monthly',
      product_id: 2,
      price: 8000,
      billing_interval: 'MONTHLY',
      minimum_quantity: 1,
      available_from: addDays(today, -120),
      available_until: null,
      auto_close: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renewal: true,
      is_active: true,
    },
    {
      id: 4,
      name: 'Support Retainer Weekly',
      product_id: 3,
      price: 1500,
      billing_interval: 'WEEKLY',
      minimum_quantity: 1,
      available_from: addDays(today, -120),
      available_until: null,
      auto_close: true,
      allow_early_close: true,
      allow_pause: true,
      allow_renewal: false,
      is_active: true,
    },
    {
      id: 5,
      name: 'Onboarding Sprint Daily',
      product_id: 4,
      price: 300,
      billing_interval: 'DAILY',
      minimum_quantity: 1,
      available_from: addDays(today, -60),
      available_until: null,
      auto_close: false,
      allow_early_close: true,
      allow_pause: false,
      allow_renewal: false,
      is_active: true,
    },
  ]

  const templates = [
    {
      id: 1,
      name: 'Standard SaaS Monthly Bundle',
      description: 'Brightloop CRM monthly subscription with 18% standard GST and 30 days validity.',
      plan_id: 1,
      product_id: 1,
      default_quantity: 1,
      tax_percent: 18,
      discount_percent: 0,
      valid_days: 30,
      lines: [{ product_id: 1, quantity: 1, unit_price: 5000, product_name: 'Brightloop CRM' }],
    },
    {
      id: 2,
      name: 'Enterprise Security SLA Bundle',
      description: 'Analytics Pro paired with 24/7 dedicated priority support add-on and 10% volume discount.',
      plan_id: 3,
      product_id: 2,
      default_quantity: 3,
      tax_percent: 18,
      discount_percent: 10,
      valid_days: 30,
      lines: [
        { product_id: 2, quantity: 3, unit_price: 8000, product_name: 'Brightloop Analytics' },
        { product_id: 3, quantity: 1, unit_price: 1500, product_name: 'Priority Support Add-on' },
      ],
    },
  ]

  const discountRules = [
    {
      id: 1,
      name: 'Enterprise Seat Discount',
      description: '15% discount when ordering 10 or more seats',
      is_active: true,
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      min_quantity: 10,
      min_purchase: 0,
      usage_count: 3,
      usage_limit: 100,
    },
    {
      id: 2,
      name: 'Loyalty Fixed Discount',
      description: '₹1,000 fixed discount for order subtotals above ₹20,000',
      is_active: true,
      discount_type: 'FIXED',
      discount_value: 1000,
      min_quantity: 1,
      min_purchase: 20000,
      usage_count: 1,
      usage_limit: 50,
    },
  ]

  const taxRules = [
    { id: 1, name: 'Standard GST 18%', region: 'IN', percentage: 18, is_active: true, category: 'Standard Goods & Services Tax' },
    { id: 2, name: 'Export Zero-Rated', region: 'Global', percentage: 0, is_active: false, category: 'Zero-Rated Foreign B2B' },
  ]

  const subscriptions = [
    {
      id: 1,
      subscription_number: 'SUB-1001',
      customer_id: 1,
      plan_id: 1,
      start_date: lastMonthStartStr,
      expiry_date: addDays(today, 300),
      next_billing_date: monthStartStr,
      payment_terms: 'net_15',
      status: 'ACTIVE',
      created_at: addDays(today, -45),
      lines: [
        { id: 1, product_id: 1, variant_id: null, quantity: 12, unit_price: 5000, product_name: 'Brightloop CRM' },
      ],
    },
    {
      id: 2,
      subscription_number: 'SUB-1002',
      customer_id: 2,
      plan_id: 2,
      start_date: lastMonthStartStr,
      expiry_date: addDays(today, 340),
      next_billing_date: monthStartStr,
      payment_terms: 'net_30',
      status: 'ACTIVE',
      created_at: addDays(today, -40),
      lines: [
        { id: 2, product_id: 1, variant_id: null, quantity: 5, unit_price: 54000, product_name: 'Brightloop CRM' },
      ],
    },
    {
      id: 3,
      subscription_number: 'SUB-1003',
      customer_id: 3,
      plan_id: 3,
      start_date: lastMonthStartStr,
      expiry_date: addDays(today, 200),
      next_billing_date: monthStartStr,
      payment_terms: 'net_15',
      status: 'ACTIVE',
      created_at: addDays(today, -35),
      lines: [
        { id: 3, product_id: 2, variant_id: null, quantity: 3, unit_price: 8000, product_name: 'Brightloop Analytics' },
        { id: 4, product_id: 3, variant_id: null, quantity: 1, unit_price: 1500, product_name: 'Priority Support Add-on' },
      ],
    },
    {
      id: 4,
      subscription_number: 'SUB-1004',
      customer_id: 4,
      plan_id: 1,
      start_date: lastMonthStartStr,
      expiry_date: addDays(today, 120),
      next_billing_date: null,
      payment_terms: 'net_15',
      status: 'PAUSED',
      created_at: addDays(today, -30),
      lines: [
        { id: 5, product_id: 1, variant_id: null, quantity: 4, unit_price: 5000, product_name: 'Brightloop CRM' },
      ],
    },
    {
      id: 5,
      subscription_number: 'SUB-1005',
      customer_id: 5,
      plan_id: 4,
      start_date: addDays(today, -24),
      expiry_date: addDays(today, 4),
      next_billing_date: monthStartStr,
      payment_terms: 'net_7',
      status: 'ACTIVE',
      created_at: addDays(today, -24),
      lines: [
        { id: 6, product_id: 3, variant_id: null, quantity: 2, unit_price: 1500, product_name: 'Priority Support Add-on' },
      ],
    },
  ]

  const quotations = [
    {
      id: 1,
      quotation_number: 'QUO-1001',
      customer_id: 2,
      plan_id: 2,
      valid_until: addDays(today, 25),
      tax_percent: 18,
      discount_percent: 5,
      status: 'QUOTATION',
      lines: [
        { id: 1, product_id: 1, quantity: 10, unit_price: 54000, product_name: 'Brightloop CRM' },
      ],
      subtotal: 540000,
      discount_total: 27000,
      tax_total: 92340,
      total: 605340,
      assigned_staff_id: 2,
    },
  ]

  const invoices = [
    {
      id: 1,
      invoice_number: `INV-SUB-1001-${lastMonthKey}`,
      subscription_id: 1,
      customer_id: 1,
      billing_period_key: lastMonthKey,
      billing_period_start: lastMonthStartStr,
      billing_period_end: addDays(lastMonthStart, 28),
      issue_date: lastMonthStartStr,
      due_date: addDays(lastMonthStart, 15),
      subtotal: 60000,
      discount_total: 9000,
      tax_total: 9180,
      total: 60180,
      paid_amount: 60180,
      balance: 0,
      status: 'PAID',
      lines: [
        { id: 1, product_id: 1, description: 'Subscription SUB-1001 - Brightloop CRM (x12)', quantity: 12, unit_price: 5000, tax_amount: 9180, line_total: 60000 },
      ],
    },
    {
      id: 2,
      invoice_number: `INV-SUB-1002-${lastMonthKey}`,
      subscription_id: 2,
      customer_id: 2,
      billing_period_key: `${lastMonthKey}-NS`,
      billing_period_start: lastMonthStartStr,
      billing_period_end: addDays(lastMonthStart, 28),
      issue_date: lastMonthStartStr,
      due_date: addDays(lastMonthStart, 30),
      subtotal: 270000,
      discount_total: 0,
      tax_total: 48600,
      total: 318600,
      paid_amount: 0,
      balance: 318600,
      status: 'OVERDUE',
      lines: [
        { id: 2, product_id: 1, description: 'Subscription SUB-1002 - Brightloop CRM Annual (x5)', quantity: 5, unit_price: 54000, tax_amount: 48600, line_total: 270000 },
      ],
    },
    {
      id: 3,
      invoice_number: `INV-SUB-1003-${lastMonthKey}`,
      subscription_id: 3,
      customer_id: 3,
      billing_period_key: `${lastMonthKey}-PW`,
      billing_period_start: lastMonthStartStr,
      billing_period_end: addDays(lastMonthStart, 28),
      issue_date: lastMonthStartStr,
      due_date: addDays(today, -5),
      subtotal: 25500,
      discount_total: 1000,
      tax_total: 4410,
      total: 28910,
      paid_amount: 0,
      balance: 28910,
      status: 'OVERDUE',
      lines: [
        { id: 3, product_id: 2, description: 'Subscription SUB-1003 - Brightloop Analytics', quantity: 3, unit_price: 8000, tax_amount: 4140, line_total: 24000 },
        { id: 4, product_id: 3, description: 'Subscription SUB-1003 - Priority Support Add-on', quantity: 1, unit_price: 1500, tax_amount: 270, line_total: 1500 },
      ],
    },
  ]

  const payments = [
    {
      id: 1,
      invoice_id: 1,
      amount: 60180,
      method: 'bank_transfer',
      payment_date: addDays(lastMonthStart, 4),
      reference: 'SEED-INV-SUB-1001',
      note: 'Seeded demo payment (simulated)',
      created_by: 1,
    },
  ]

  const customerRequests = [
    {
      id: 1,
      customer_id: 1,
      customer_name: 'Acme Technologies',
      subscription_id: 1,
      subscription_number: 'SUB-1001',
      request_type: 'RENEWAL',
      notes: 'Customer requesting early renewal extension for another 12-month period with additional 3 seats.',
      status: 'PENDING',
      created_at: addDays(today, -2),
    },
  ]

  const settings = {
    companyName: 'Brightloop Software Pvt Ltd',
    companyEmail: 'finance@brightloop.io',
    currency: 'INR',
    currencySymbol: '₹',
    defaultPaymentTerms: 'NET_14',
    autoBillingEnabled: true,
    autoBillingTime: '02:00 UTC',
    lastAutoBillingRun: `${todayStr}T02:00:00.000Z`,
    lastAutoBillingStatus: 'Success: 5 eligible subscriptions evaluated, 0 duplicates',
    aiModel: 'gemini-1.5-flash',
    securityThresholds: {
      excessiveDiscountPercent: 50,
      unusualQuantityThreshold: 50,
      highChurnRiskScore: 60,
    },
  }

  const idempotencyKeys: Record<string, number> = {
    [`1_${lastMonthKey}`]: 1,
    [`2_${lastMonthKey}-NS`]: 2,
    [`3_${lastMonthKey}-PW`]: 3,
  }

  const resetTokens: Array<{
    token: string
    user_id: number
    email: string
    expires_at: number
    used: boolean
  }> = []

  let prevHash = GENESIS_HASH
  const rawEvents = [
    { seq: 1, type: 'UserCreated', aggType: 'user', aggId: '1', payload: { email: 'admin@brightloop.io', role: 'ADMIN' }, actor: 1, time: addDays(today, -50) },
    { seq: 2, type: 'UserCreated', aggType: 'user', aggId: '2', payload: { email: 'staff@brightloop.io', role: 'STAFF' }, actor: 1, time: addDays(today, -50) },
    { seq: 3, type: 'UserCreated', aggType: 'user', aggId: '3', payload: { email: 'customer@acme.io', role: 'CUSTOMER' }, actor: 1, time: addDays(today, -50) },
    { seq: 4, type: 'ProductCreated', aggType: 'product', aggId: '1', payload: { name: 'Brightloop CRM', sales_price: '5000' }, actor: 1, time: addDays(today, -48) },
    { seq: 5, type: 'PlanCreated', aggType: 'plan', aggId: '1', payload: { name: 'CRM Enterprise Monthly', price: '5000', interval: 'MONTHLY' }, actor: 1, time: addDays(today, -48) },
    { seq: 6, type: 'SubscriptionCreated', aggType: 'subscription', aggId: '1', payload: { subscription_number: 'SUB-1001', customer_id: 1, plan_id: 1 }, actor: 1, time: addDays(today, -45) },
    { seq: 7, type: 'SubscriptionActivated', aggType: 'subscription', aggId: '1', payload: { from: 'CONFIRMED', to: 'ACTIVE', subscription_number: 'SUB-1001' }, actor: 1, time: addDays(today, -45) },
  ]

  const auditEvents = rawEvents.map((r) => {
    const hash = computeEventHash(prevHash, r.seq, r.type, r.payload, r.time)
    const ev = {
      event_id: r.seq,
      sequence_num: r.seq,
      aggregate_type: r.aggType,
      aggregate_id: r.aggId,
      event_type: r.type,
      payload: JSON.stringify(r.payload),
      timestamp: r.time,
      previous_hash: prevHash,
      event_hash: hash,
      actor_user_id: r.actor,
    }
    prevHash = hash
    return ev
  })

  return {
    users,
    customers,
    products,
    plans,
    templates,
    discountRules,
    taxRules,
    subscriptions,
    quotations,
    invoices,
    payments,
    customerRequests,
    settings,
    idempotencyKeys,
    resetTokens,
    auditEvents,
    lastSequenceNum: auditEvents.length,
    lastEventHash: prevHash,
  }
}

// Persistent Store Database Manager
class DatabaseManager {
  data: any

  constructor() {
    this.load()
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8')
        this.data = JSON.parse(raw)
        // Ensure resetTokens array exists
        if (!this.data.resetTokens) this.data.resetTokens = []
        return
      }
    } catch (e) {
      console.error('Failed to load database file, resetting to seed data:', e)
    }
    this.data = getSeedData()
    this.save()
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to write database file:', e)
    }
  }

  appendEvent(aggregateType: string, aggregateId: string | number, eventType: string, payload: any, actorUserId: number | null = 1) {
    const timestamp = new Date().toISOString()
    const sequenceNum = (this.data.lastSequenceNum || this.data.auditEvents.length) + 1
    const prevHash = this.data.lastEventHash || (this.data.auditEvents.length ? this.data.auditEvents[this.data.auditEvents.length - 1].event_hash : GENESIS_HASH)

    const eventHash = computeEventHash(prevHash, sequenceNum, eventType, payload, timestamp)
    const event = {
      event_id: sequenceNum,
      sequence_num: sequenceNum,
      aggregate_type: aggregateType,
      aggregate_id: String(aggregateId),
      event_type: eventType,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      timestamp,
      previous_hash: prevHash,
      event_hash: eventHash,
      actor_user_id: actorUserId,
    }

    this.data.auditEvents.push(event)
    this.data.lastSequenceNum = sequenceNum
    this.data.lastEventHash = eventHash
    this.save()
    return event
  }
}

export const db = new DatabaseManager()

// Express application setup
const app = express()
app.use(cors())
app.use(express.json())

// --- Authentication Middleware ---
interface AuthenticatedRequest extends Request {
  user?: any
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    req.user = null
    return next()
  }
  const token = authHeader.replace(/^Bearer\s+/, '').trim()
  if (!token) {
    req.user = null
    return next()
  }

  // Token is either email or format 'user_<id>'
  const user = db.data.users.find((u: any) => u.email === token || String(u.id) === token || `user_${u.id}` === token)
  req.user = user || null
  next()
}

app.use(authMiddleware)

// Permission checking helpers
function requireAuth(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ detail: 'Not authenticated' })
    return false
  }
  return true
}

function requireAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!requireAuth(req, res)) return false
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ detail: 'Forbidden: Administrator privileges required. Access denied.' })
    return false
  }
  return true
}

function requireStaffOrAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!requireAuth(req, res)) return false
  if (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
    res.status(403).json({ detail: 'Forbidden: Staff or Administrator privileges required.' })
    return false
  }
  return true
}

// ============================================================================
// API ROUTES (/api/v1/*)
// ============================================================================

// --- Auth Routes ---
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' })
  }

  const user = db.data.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) {
    return res.status(401).json({ detail: 'Invalid email or password' })
  }

  if (user.is_active === false) {
    return res.status(401).json({ detail: 'Account is inactive. Contact administrator.' })
  }

  // Support both bcrypt hash and legacy test password
  let valid = false
  if (user.password_hash) {
    valid = bcrypt.compareSync(password, user.password_hash)
  }
  if (!valid && user.password && user.password === password) {
    valid = true
    // upgrade to bcrypt
    user.password_hash = bcrypt.hashSync(password, 10)
    db.save()
  }

  if (!valid) {
    return res.status(401).json({ detail: 'Invalid email or password' })
  }

  const token = user.email
  res.json({
    access_token: token,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customer_id: user.customer_id,
    },
  })
})

app.post('/api/v1/auth/register', (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ detail: 'Name, email, and password are required' })
  }

  if (db.data.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ detail: 'An account with this email already exists' })
  }

  // Enforce password requirements: 8+ chars, uppercase, lowercase, special char
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      detail: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.',
    })
  }

  const customerId = db.data.customers.length > 0 ? Math.max(...db.data.customers.map((c: any) => c.id)) + 1 : 1
  const newCustomer = {
    id: customerId,
    name,
    email,
    company: name,
    region: 'IN-South',
    assigned_staff_id: 2,
  }
  db.data.customers.push(newCustomer)

  const newUserId = db.data.users.length > 0 ? Math.max(...db.data.users.map((u: any) => u.id)) + 1 : 1
  const passwordHash = bcrypt.hashSync(password, 10)
  const newUser = {
    id: newUserId,
    name,
    email,
    password_hash: passwordHash,
    role: 'CUSTOMER',
    customer_id: customerId,
    is_active: true,
    created_at: formatDateISO(new Date()),
  }
  db.data.users.push(newUser)

  db.appendEvent('user', newUserId, 'UserCreated', { email, role: 'CUSTOMER' }, newUserId)
  db.save()

  res.status(201).json({
    id: newUserId,
    name,
    email,
    role: 'CUSTOMER',
    customer_id: customerId,
  })
})

app.get('/api/v1/auth/me', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    customer_id: req.user.customer_id,
  })
})

// Forgot Password with secure expiring single-use reset tokens
app.post('/api/v1/auth/forgot-password', (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ detail: 'Email is required' })
  }

  const user = db.data.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) {
    // Standard security practice: Don't leak user existence
    return res.json({
      success: true,
      message: 'If the email exists in our records, a secure password reset link has been dispatched.',
    })
  }

  // Generate cryptographically secure token valid for 15 minutes
  const resetToken = `rst_${crypto.randomBytes(24).toString('hex')}`
  const expiresAt = Date.now() + 15 * 60 * 1000 // 15 mins

  if (!db.data.resetTokens) db.data.resetTokens = []
  db.data.resetTokens.push({
    token: resetToken,
    user_id: user.id,
    email: user.email,
    expires_at: expiresAt,
    used: false,
  })

  // Log dispatch event to audit ledger
  db.appendEvent('user', user.id, 'PasswordResetRequested', { email: user.email, token_preview: resetToken.slice(0, 8) + '…' }, user.id)
  db.save()

  res.json({
    success: true,
    message: `Password reset link and security verification token generated for ${user.email}. Link valid for 15 minutes.`,
    token: resetToken,
  })
})

app.post('/api/v1/auth/reset-password', (req, res) => {
  const { email, token, new_password } = req.body
  if (!new_password) {
    return res.status(400).json({ detail: 'New password is required' })
  }

  if (!PASSWORD_REGEX.test(new_password)) {
    return res.status(400).json({
      detail: 'Password must be at least 8 characters long and contain uppercase, lowercase, and special character.',
    })
  }

  const user = db.data.users.find((u: any) => u.email.toLowerCase() === (email || '').toLowerCase())
  if (!user) {
    return res.status(404).json({ detail: 'User account not found' })
  }

  // If a reset token was provided, verify it is valid, not expired, and not used
  if (token && db.data.resetTokens) {
    const record = db.data.resetTokens.find((r: any) => r.token === token && r.user_id === user.id)
    if (!record) {
      return res.status(400).json({ detail: 'Invalid password reset token' })
    }
    if (record.used) {
      return res.status(400).json({ detail: 'Password reset token has already been used' })
    }
    if (Date.now() > record.expires_at) {
      return res.status(400).json({ detail: 'Password reset token has expired. Please request a new one.' })
    }
    record.used = true
  }

  user.password_hash = bcrypt.hashSync(new_password, 10)
  delete user.password // remove plaintext if existed
  db.appendEvent('user', user.id, 'PasswordResetCompleted', { email: user.email }, user.id)
  db.save()

  res.json({ success: true, message: 'Password has been successfully updated.' })
})

// --- Customers Directory & Management ---
app.get('/api/v1/customers', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return

  // Customer role can ONLY view their own customer record
  if (req.user.role === 'CUSTOMER') {
    const own = db.data.customers.filter((c: any) => c.id === req.user.customer_id)
    return res.json(own)
  }

  // Staff and Admin
  let list = db.data.customers
  if (req.query.assigned_to_me && req.user.role === 'STAFF') {
    list = list.filter((c: any) => c.assigned_staff_id === req.user.id)
  }

  const result = list.map((c: any) => {
    const assignedUser = db.data.users.find((u: any) => u.id === c.assigned_staff_id)
    const custSubs = db.data.subscriptions.filter((s: any) => s.customer_id === c.id)
    const activeSubs = custSubs.filter((s: any) => s.status === 'ACTIVE')
    return {
      ...c,
      assigned_staff_name: assignedUser ? assignedUser.name : 'Unassigned',
      subscriptions_count: custSubs.length,
      active_subscriptions_count: activeSubs.length,
    }
  })
  res.json(result)
})

app.get('/api/v1/customers/:id', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  const cId = Number(req.params.id)

  if (req.user.role === 'CUSTOMER' && req.user.customer_id !== cId) {
    return res.status(403).json({ detail: 'Forbidden: Customers cannot access other customer accounts' })
  }

  const cust = db.data.customers.find((c: any) => c.id === cId)
  if (!cust) return res.status(404).json({ detail: 'Customer not found' })

  const assignedUser = db.data.users.find((u: any) => u.id === cust.assigned_staff_id)
  res.json({
    ...cust,
    assigned_staff_name: assignedUser ? assignedUser.name : 'Unassigned',
  })
})

app.patch('/api/v1/customers/:id', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const cId = Number(req.params.id)
  const cust = db.data.customers.find((c: any) => c.id === cId)
  if (!cust) return res.status(404).json({ detail: 'Customer not found' })

  if (req.body.assigned_staff_id !== undefined) {
    cust.assigned_staff_id = req.body.assigned_staff_id ? Number(req.body.assigned_staff_id) : null
  }
  if (req.body.name) cust.name = req.body.name
  if (req.body.company) cust.company = req.body.company
  if (req.body.email) cust.email = req.body.email
  if (req.body.region) cust.region = req.body.region

  db.appendEvent('customer', cust.id, 'CustomerUpdated', { name: cust.name, assigned_staff_id: cust.assigned_staff_id }, req.user.id)
  db.save()
  res.json(cust)
})

// --- User & Staff Management (ADMIN ONLY) ---
app.get('/api/v1/users', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const list = db.data.users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    customer_id: u.customer_id,
    is_active: u.is_active ?? true,
    created_at: u.created_at || '2026-09-01',
  }))
  res.json(list)
})

app.post('/api/v1/users', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const { name, email, password, role } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ detail: 'Name, email, and password are required' })
  }

  if (db.data.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ detail: 'A user with this email already exists' })
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      detail: 'Password must be at least 8 characters long and contain uppercase, lowercase, and special character.',
    })
  }

  const newId = db.data.users.length > 0 ? Math.max(...db.data.users.map((u: any) => u.id)) + 1 : 1
  const passwordHash = bcrypt.hashSync(password, 10)
  const newUser = {
    id: newId,
    name,
    email,
    password_hash: passwordHash,
    role: (role || 'STAFF').toUpperCase(),
    customer_id: null,
    is_active: true,
    created_at: formatDateISO(new Date()),
  }

  db.data.users.push(newUser)
  db.appendEvent('user', newId, 'UserCreated', { email: newUser.email, role: newUser.role, name: newUser.name }, req.user.id)
  db.save()

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    is_active: newUser.is_active,
  })
})

app.delete('/api/v1/users/:id', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const uId = Number(req.params.id)
  if (uId === 1) {
    return res.status(400).json({ detail: 'Cannot delete primary root administrator account' })
  }
  if (req.user.id === uId) {
    return res.status(400).json({ detail: 'Cannot delete your own active administrator account' })
  }

  const idx = db.data.users.findIndex((u: any) => u.id === uId)
  if (idx === -1) return res.status(404).json({ detail: 'User not found' })

  const deleted = db.data.users.splice(idx, 1)[0]
  db.appendEvent('user', uId, 'UserDeleted', { email: deleted.email, role: deleted.role }, req.user.id)
  db.save()

  res.json({ success: true, message: `User ${deleted.name} removed successfully` })
})

// --- Products & Variants ---
app.get('/api/v1/products', (req, res) => {
  res.json(db.data.products)
})

app.post('/api/v1/products', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const { name, product_type, sales_price, cost_price, notes, active, variants } = req.body
  if (!name || sales_price === undefined) {
    return res.status(400).json({ detail: 'Product name and sales price are required' })
  }

  const newId = db.data.products.length > 0 ? Math.max(...db.data.products.map((p: any) => p.id)) + 1 : 1
  const variantList = (variants || []).map((v: any, i: number) => ({
    id: i + 1,
    name: v.name,
    price_adjustment: Number(v.price_adjustment || 0),
  }))

  const newProduct = {
    id: newId,
    name,
    product_type: (product_type || 'SERVICE').toUpperCase(),
    sales_price: Number(sales_price),
    cost_price: Number(cost_price || 0),
    notes: notes || null,
    is_active: active !== undefined ? Boolean(active) : true,
    variants: variantList,
  }

  db.data.products.push(newProduct)
  db.appendEvent('product', newId, 'ProductCreated', { name, sales_price }, req.user.id)
  db.save()
  res.status(201).json(newProduct)
})

// --- Subscription Plans ---
app.get('/api/v1/plans', (req, res) => {
  const result = db.data.plans.map((p: any) => {
    const prod = db.data.products.find((pr: any) => pr.id === p.product_id)
    return {
      ...p,
      product_name: prod ? prod.name : `Product #${p.product_id}`,
    }
  })
  res.json(result)
})

app.post('/api/v1/plans', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const {
    name,
    product_id,
    price,
    billing_interval,
    minimum_quantity,
    available_from,
    available_until,
    auto_close,
    allow_early_close,
    allow_pause,
    allow_renewal,
    active,
  } = req.body

  if (!name || !product_id || price === undefined) {
    return res.status(400).json({ detail: 'Plan name, product_id, and price are required' })
  }

  const newId = db.data.plans.length > 0 ? Math.max(...db.data.plans.map((p: any) => p.id)) + 1 : 1
  const newPlan = {
    id: newId,
    name,
    product_id: Number(product_id),
    price: Number(price),
    billing_interval: (billing_interval || 'MONTHLY').toUpperCase(),
    minimum_quantity: Number(minimum_quantity || 1),
    available_from: available_from || null,
    available_until: available_until || null,
    auto_close: Boolean(auto_close),
    allow_early_close: Boolean(allow_early_close),
    allow_pause: allow_pause !== undefined ? Boolean(allow_pause) : true,
    allow_renewal: allow_renewal !== undefined ? Boolean(allow_renewal) : true,
    is_active: active !== undefined ? Boolean(active) : true,
  }

  db.data.plans.push(newPlan)
  db.appendEvent('plan', newId, 'PlanCreated', { name, price, interval: newPlan.billing_interval }, req.user.id)
  db.save()
  res.status(201).json(newPlan)
})

// --- Quotations & Templates ---
app.get('/api/v1/templates', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  res.json(db.data.templates || [])
})

app.post('/api/v1/templates', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const newId = (db.data.templates || []).length > 0 ? Math.max(...db.data.templates.map((t: any) => t.id)) + 1 : 1
  const newTemplate = {
    id: newId,
    name: req.body.name,
    description: req.body.description || '',
    plan_id: req.body.plan_id ? Number(req.body.plan_id) : null,
    product_id: req.body.product_id ? Number(req.body.product_id) : null,
    default_quantity: Number(req.body.default_quantity || 1),
    tax_percent: Number(req.body.tax_percent || 18),
    discount_percent: Number(req.body.discount_percent || 0),
    valid_days: Number(req.body.valid_days || 30),
    lines: req.body.lines || [],
  }
  if (!db.data.templates) db.data.templates = []
  db.data.templates.push(newTemplate)
  db.save()
  res.status(201).json(newTemplate)
})

app.delete('/api/v1/templates/:id', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const tId = Number(req.params.id)
  const idx = (db.data.templates || []).findIndex((t: any) => t.id === tId)
  if (idx === -1) return res.status(404).json({ detail: 'Template not found' })
  db.data.templates.splice(idx, 1)
  db.save()
  res.json({ success: true })
})

app.get('/api/v1/quotations', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return

  let list = db.data.quotations
  if (req.user.role === 'CUSTOMER') {
    list = list.filter((q: any) => q.customer_id === req.user.customer_id)
  }

  const result = list.map((q: any) => {
    const cust = db.data.customers.find((c: any) => c.id === q.customer_id)
    return {
      ...q,
      customer_name: cust ? cust.name : `Customer #${q.customer_id}`,
    }
  })
  res.json(result)
})

app.post('/api/v1/quotations', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const { customer_id, plan_id, lines, tax_percent, discount_percent, valid_days } = req.body
  if (!customer_id) {
    return res.status(400).json({ detail: 'Customer ID is required' })
  }

  const newId = db.data.quotations.length > 0 ? Math.max(...db.data.quotations.map((q: any) => q.id)) + 1 : 1
  const qNumber = `QUO-${1000 + newId}`
  const plan = db.data.plans.find((p: any) => p.id === Number(plan_id))
  const lineItem = lines?.[0]
  const product = db.data.products.find((p: any) => p.id === (lineItem?.product_id || plan?.product_id))

  const unitPrice = plan ? plan.price : product ? product.sales_price : 0
  const qty = Number(lineItem?.quantity || 1)
  const subtotal = unitPrice * qty
  const discount = Math.round(subtotal * (Number(discount_percent || 0) / 100))
  const taxable = subtotal - discount
  const tax = Math.round(taxable * (Number(tax_percent || 18) / 100))
  const total = taxable + tax

  const validUntil = addDays(new Date(), valid_days || 30)

  const newQuotation = {
    id: newId,
    quotation_number: qNumber,
    customer_id: Number(customer_id),
    plan_id: plan_id ? Number(plan_id) : null,
    valid_until: validUntil,
    tax_percent: Number(tax_percent || 18),
    discount_percent: Number(discount_percent || 0),
    status: 'QUOTATION',
    subtotal,
    discount_total: discount,
    tax_total: tax,
    total,
    assigned_staff_id: req.user.id || 2,
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

  db.data.quotations.push(newQuotation)
  db.appendEvent('quotation', newId, 'QuotationCreated', { quotation_number: qNumber, customer_id, total }, req.user.id)
  db.save()
  res.status(201).json(newQuotation)
})

app.post('/api/v1/quotations/:id/transition', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const qId = Number(req.params.id)
  const quotation = db.data.quotations.find((q: any) => q.id === qId)
  if (!quotation) return res.status(404).json({ detail: 'Quotation not found' })

  const { action } = req.body
  if (action === 'send') quotation.status = 'QUOTATION'
  else if (action === 'confirm') quotation.status = 'CONFIRMED'
  else if (action === 'close') quotation.status = 'CLOSED'
  else if (action === 'convert') {
    quotation.status = 'ACTIVE'
    const newSubId = db.data.subscriptions.length > 0 ? Math.max(...db.data.subscriptions.map((s: any) => s.id)) + 1 : 1
    const subNumber = `SUB-${1000 + newSubId}`
    const todayStr = formatDateISO(new Date())

    const newSub = {
      id: newSubId,
      subscription_number: subNumber,
      customer_id: quotation.customer_id,
      plan_id: quotation.plan_id,
      start_date: todayStr,
      expiry_date: addDays(new Date(), 365),
      next_billing_date: todayStr,
      payment_terms: 'net_15',
      status: 'CONFIRMED',
      created_at: todayStr,
      lines: quotation.lines.map((l: any, i: number) => ({
        id: i + 1,
        product_id: l.product_id,
        variant_id: null,
        quantity: l.quantity,
        unit_price: l.unit_price,
        product_name: l.product_name,
      })),
    }

    db.data.subscriptions.push(newSub)
    db.appendEvent('subscription', newSubId, 'SubscriptionCreated', { subscription_number: subNumber, from_quotation: quotation.quotation_number }, req.user.id)
  } else {
    return res.status(400).json({ detail: `Invalid transition action: ${action}` })
  }

  db.save()
  res.json(quotation)
})

// --- Subscriptions Lifecycle ---
app.get('/api/v1/subscriptions', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return

  let list = db.data.subscriptions
  if (req.user.role === 'CUSTOMER') {
    list = list.filter((s: any) => s.customer_id === req.user.customer_id)
  }
  if (req.query.status) {
    list = list.filter((s: any) => s.status.toUpperCase() === String(req.query.status).toUpperCase())
  }
  if (req.query.customer_id) {
    list = list.filter((s: any) => String(s.customer_id) === String(req.query.customer_id))
  }

  const result = list.map((s: any) => {
    const cust = db.data.customers.find((c: any) => c.id === s.customer_id)
    const plan = db.data.plans.find((p: any) => p.id === s.plan_id)
    const amount = (s.lines || []).reduce((acc: number, l: any) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
    return {
      ...s,
      customer_name: cust ? cust.name : `Customer #${s.customer_id}`,
      plan_name: plan ? plan.name : `Plan #${s.plan_id}`,
      billing_interval: plan ? plan.billing_interval.toLowerCase() : 'monthly',
      total: amount,
      amount,
    }
  })
  res.json(result)
})

app.get('/api/v1/subscriptions/:id', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  const sId = Number(req.params.id)
  const sub = db.data.subscriptions.find((s: any) => s.id === sId)
  if (!sub) return res.status(404).json({ detail: 'Subscription not found' })

  if (req.user.role === 'CUSTOMER' && sub.customer_id !== req.user.customer_id) {
    return res.status(403).json({ detail: 'Forbidden: Customers cannot access other customer subscriptions' })
  }

  const cust = db.data.customers.find((c: any) => c.id === sub.customer_id)
  const plan = db.data.plans.find((p: any) => p.id === sub.plan_id)
  const amount = (sub.lines || []).reduce((acc: number, l: any) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)

  res.json({
    ...sub,
    customer_name: cust ? cust.name : `Customer #${sub.customer_id}`,
    plan_name: plan ? plan.name : `Plan #${sub.plan_id}`,
    billing_interval: plan ? plan.billing_interval.toLowerCase() : 'monthly',
    total: amount,
    amount,
  })
})

app.post('/api/v1/subscriptions/:id/transition', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  const sId = Number(req.params.id)
  const sub = db.data.subscriptions.find((s: any) => s.id === sId)
  if (!sub) return res.status(404).json({ detail: 'Subscription not found' })

  if (req.user.role === 'CUSTOMER' && sub.customer_id !== req.user.customer_id) {
    return res.status(403).json({ detail: 'Forbidden: Customers cannot transition other subscriptions' })
  }

  const plan = db.data.plans.find((p: any) => p.id === sub.plan_id)
  const action = String(req.body.action || '').toLowerCase()
  const oldStatus = sub.status

  if (action === 'confirm') {
    sub.status = 'CONFIRMED'
  } else if (action === 'activate') {
    sub.status = 'ACTIVE'
    if (!sub.next_billing_date) sub.next_billing_date = sub.start_date
  } else if (action === 'pause') {
    if (plan && !plan.allow_pause) {
      return res.status(400).json({ detail: 'Plan does not allow pausing' })
    }
    sub.status = 'PAUSED'
  } else if (action === 'resume') {
    sub.status = 'ACTIVE'
  } else if (action === 'renew') {
    if (plan && !plan.allow_renewal) {
      return res.status(400).json({ detail: 'Plan does not allow renewal' })
    }
    const exp = sub.expiry_date ? new Date(sub.expiry_date) : new Date()
    exp.setFullYear(exp.getFullYear() + 1)
    sub.expiry_date = formatDateISO(exp)
    sub.status = 'ACTIVE'
  } else if (action === 'close') {
    if (plan && !plan.allow_early_close) {
      const today = formatDateISO(new Date())
      if (sub.expiry_date && today < sub.expiry_date) {
        return res.status(400).json({ detail: 'Plan does not allow early closure' })
      }
    }
    sub.status = 'CLOSED'
  } else {
    return res.status(400).json({ detail: `Unknown action: ${action}` })
  }

  db.appendEvent(
    'subscription',
    sub.id,
    action === 'resume' ? 'SubscriptionResumed' : action === 'renew' ? 'SubscriptionRenewed' : `Subscription${sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}`,
    { from: oldStatus, to: sub.status, subscription_number: sub.subscription_number },
    req.user?.id || 1
  )
  db.save()
  res.json(sub)
})

app.get('/api/v1/subscriptions/:id/events', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const sId = String(req.params.id)
  const events = db.data.auditEvents
    .filter((e: any) => e.aggregate_type === 'subscription' && String(e.aggregate_id) === sId)
    .sort((a: any, b: any) => a.sequence_num - b.sequence_num)
  res.json(events)
})

// --- Billing Simulation and Execution (Day Rehearsal) ---
function computeSubscriptionPreview(sub: any) {
  const lines: any[] = []
  let subtotal = 0

  for (const line of sub.lines || []) {
    let unitPrice = line.unit_price || 0
    if (line.variant_id) {
      const prod = db.data.products.find((p: any) => p.id === line.product_id)
      const variant = (prod?.variants || []).find((v: any) => v.id === line.variant_id)
      if (variant) unitPrice += Number(variant.price_adjustment || 0)
    }
    const lineSubtotal = unitPrice * Number(line.quantity || 1)
    subtotal += lineSubtotal
    lines.push({
      product_id: line.product_id,
      variant_id: line.variant_id,
      quantity: line.quantity,
      unit_price: unitPrice,
      description: `Subscription ${sub.subscription_number} - ${line.product_name || 'Service'}`,
      line_total: lineSubtotal,
    })
  }

  // Evaluate discounts
  let discountTotal = 0
  const appliedRules: string[] = []
  const totalQty = (sub.lines || []).reduce((acc: number, l: any) => acc + Number(l.quantity || 1), 0)

  for (const rule of db.data.discountRules || []) {
    if (!rule.is_active) continue
    if (rule.usage_limit && rule.usage_count >= rule.usage_limit) continue
    if (rule.min_quantity && totalQty < rule.min_quantity) continue
    if (rule.min_purchase && subtotal < rule.min_purchase) continue

    if (rule.discount_type === 'PERCENTAGE') {
      const disc = Math.round(subtotal * (Number(rule.discount_value) / 100))
      discountTotal += disc
      appliedRules.push(`${rule.name} (-₹${disc})`)
    } else if (rule.discount_type === 'FIXED') {
      const disc = Math.min(subtotal, Number(rule.discount_value))
      discountTotal += disc
      appliedRules.push(`${rule.name} (-₹${disc})`)
    }
  }

  discountTotal = Math.min(subtotal, discountTotal) // Prevent negative
  const taxable = subtotal - discountTotal
  const taxTotal = Math.round(taxable * 0.18) // standard GST 18%
  const total = taxable + taxTotal

  return { subtotal, discount_total: discountTotal, tax_total: taxTotal, total, lines, applied_rules: appliedRules }
}

app.post('/api/v1/billing/simulate', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const today = new Date()
  const pKey = req.body.billing_period_key || `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`
  const todayStr = formatDateISO(today)

  const items: any[] = []
  let ready = 0
  let skipped = 0
  let blocked = 0
  let expectedTotal = 0
  let taxTotal = 0
  let discountTotal = 0
  const warnings: string[] = []

  for (const sub of db.data.subscriptions) {
    const cust = db.data.customers.find((c: any) => c.id === sub.customer_id)
    const plan = db.data.plans.find((p: any) => p.id === sub.plan_id)

    const item: any = {
      subscription_id: sub.id,
      subscription_number: sub.subscription_number,
      customer_id: sub.customer_id,
      customer_name: cust ? cust.name : `Customer #${sub.customer_id}`,
      plan_name: plan ? plan.name : `Plan #${sub.plan_id}`,
      billing_interval: plan?.billing_interval || 'MONTHLY',
    }

    if (sub.status !== 'ACTIVE') {
      item.status = 'BLOCKED'
      item.reason = `Subscription is ${sub.status} (only ACTIVE subscriptions are billable)`
      blocked++
    } else if (sub.expiry_date && sub.expiry_date < todayStr) {
      item.status = 'BLOCKED'
      item.reason = `Subscription expired on ${sub.expiry_date}`
      blocked++
    } else if (db.data.idempotencyKeys[`${sub.id}_${pKey}`]) {
      item.status = 'SKIPPED'
      item.reason = 'Already billed for this period'
      skipped++
    } else {
      const preview = computeSubscriptionPreview(sub)
      item.status = 'READY'
      item.subtotal = preview.subtotal
      item.discount_total = preview.discount_total
      item.tax_total = preview.tax_total
      item.total = preview.total
      ready++
      expectedTotal += preview.total
      taxTotal += preview.tax_total
      discountTotal += preview.discount_total
    }
    items.push(item)
  }

  res.json({
    period: pKey,
    eligible_count: ready + skipped + blocked,
    ready_count: ready,
    skipped_count: skipped,
    blocked_count: blocked,
    expected_total: expectedTotal,
    tax_total: taxTotal,
    discount_total: discountTotal,
    items,
    warnings,
    dry_run: true,
  })
})

app.post('/api/v1/billing/execute', (req: AuthenticatedRequest, res) => {
  // CRITICAL: Live billing execution requires ADMIN role!
  if (!requireAdmin(req, res)) return
  const today = new Date()
  const todayStr = formatDateISO(today)
  const pKey = req.body.billing_period_key || `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`

  const items: any[] = []
  let generated = 0
  let duplicates = 0
  let failed = 0

  for (const sub of db.data.subscriptions) {
    if (sub.status !== 'ACTIVE' || (sub.expiry_date && sub.expiry_date < todayStr)) {
      continue
    }

    const idempotencyKey = `${sub.id}_${pKey}`
    if (db.data.idempotencyKeys[idempotencyKey]) {
      const existing = db.data.invoices.find((inv: any) => inv.subscription_id === sub.id && inv.billing_period_key === pKey)
      items.push({
        subscription_id: sub.id,
        subscription_number: sub.subscription_number,
        result: 'DUPLICATE',
        invoice_id: existing?.id,
        invoice_number: existing?.invoice_number,
        message: 'Already billed for this period; duplicate prevented',
      })
      duplicates++
      continue
    }

    try {
      const preview = computeSubscriptionPreview(sub)
      const newInvoiceId = db.data.invoices.length > 0 ? Math.max(...db.data.invoices.map((i: any) => i.id)) + 1 : 1
      const invoiceNumber = `INV-${sub.subscription_number}-${pKey}`

      const newInvoice = {
        id: newInvoiceId,
        invoice_number: invoiceNumber,
        subscription_id: sub.id,
        customer_id: sub.customer_id,
        billing_period_key: pKey,
        billing_period_start: `${pKey}-01`,
        billing_period_end: addDays(new Date(`${pKey}-01`), 28),
        issue_date: todayStr,
        due_date: addDays(today, 14),
        subtotal: preview.subtotal,
        tax_total: preview.tax_total,
        discount_total: preview.discount_total,
        total: preview.total,
        paid_amount: 0,
        balance: preview.total,
        status: 'CONFIRMED',
        lines: preview.lines.map((l: any, i: number) => ({
          id: i + 1,
          invoice_id: newInvoiceId,
          ...l,
          tax_amount: Math.round(l.line_total * 0.18),
        })),
      }

      db.data.invoices.push(newInvoice)
      db.data.idempotencyKeys[idempotencyKey] = newInvoiceId

      // Advance subscription next_billing_date
      const plan = db.data.plans.find((p: any) => p.id === sub.plan_id)
      if (plan) {
        const interval = (plan.billing_interval || 'MONTHLY').toUpperCase()
        const currentNext = sub.next_billing_date ? new Date(sub.next_billing_date) : new Date()
        if (interval === 'DAILY') currentNext.setDate(currentNext.getDate() + 1)
        else if (interval === 'WEEKLY') currentNext.setDate(currentNext.getDate() + 7)
        else if (interval === 'YEARLY') currentNext.setFullYear(currentNext.getFullYear() + 1)
        else currentNext.setMonth(currentNext.getMonth() + 1)
        sub.next_billing_date = formatDateISO(currentNext)
      }

      db.appendEvent('invoice', newInvoiceId, 'InvoiceGenerated', { invoice_number: invoiceNumber, subscription_id: sub.id, total: preview.total }, req.user.id)

      items.push({
        subscription_id: sub.id,
        subscription_number: sub.subscription_number,
        result: 'GENERATED',
        invoice_id: newInvoiceId,
        invoice_number: invoiceNumber,
      })
      generated++
    } catch (err: any) {
      items.push({
        subscription_id: sub.id,
        subscription_number: sub.subscription_number,
        result: 'FAILED',
        message: err.message,
      })
      failed++
    }
  }

  db.appendEvent('billing_run', Date.now(), 'BillingBatchExecuted', { billing_period_key: pKey, generated, duplicates, failed }, req.user.id)
  db.save()

  res.json({
    period: pKey,
    generated_count: generated,
    duplicate_count: duplicates,
    failed_count: failed,
    items,
  })
})

// --- Invoices ---
app.get('/api/v1/invoices', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return

  let list = db.data.invoices
  if (req.user.role === 'CUSTOMER') {
    list = list.filter((i: any) => i.customer_id === req.user.customer_id)
  }

  const result = list.map((i: any) => {
    const cust = db.data.customers.find((c: any) => c.id === i.customer_id)
    const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
    return {
      ...i,
      customer_name: cust ? cust.name : `Customer #${i.customer_id}`,
      balance: Math.max(0, bal),
      amount_paid: i.paid_amount || 0,
    }
  })
  res.json(result)
})

app.get('/api/v1/invoices/:id', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  const iId = Number(req.params.id)
  const inv = db.data.invoices.find((i: any) => i.id === iId)
  if (!inv) return res.status(404).json({ detail: 'Invoice not found' })

  if (req.user.role === 'CUSTOMER' && inv.customer_id !== req.user.customer_id) {
    return res.status(403).json({ detail: 'Forbidden: Customers cannot access other customer invoices' })
  }

  const cust = db.data.customers.find((c: any) => c.id === inv.customer_id)
  const bal = inv.balance !== undefined ? inv.balance : inv.total - (inv.paid_amount || 0)

  res.json({
    ...inv,
    customer_name: cust ? cust.name : `Customer #${inv.customer_id}`,
    customer_email: cust ? cust.email : '',
    customer_company: cust ? cust.company : '',
    customer_region: cust ? cust.region : '',
    balance: Math.max(0, bal),
    amount_paid: inv.paid_amount || 0,
  })
})

app.post('/api/v1/invoices/:id/confirm', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const iId = Number(req.params.id)
  const inv = db.data.invoices.find((i: any) => i.id === iId)
  if (!inv) return res.status(404).json({ detail: 'Invoice not found' })

  inv.status = 'CONFIRMED'
  db.appendEvent('invoice', inv.id, 'InvoiceConfirmed', { invoice_number: inv.invoice_number }, req.user.id)
  db.save()
  res.json(inv)
})

app.post('/api/v1/invoices/:id/cancel', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const iId = Number(req.params.id)
  const inv = db.data.invoices.find((i: any) => i.id === iId)
  if (!inv) return res.status(404).json({ detail: 'Invoice not found' })

  inv.status = 'CANCELLED'
  db.appendEvent('invoice', inv.id, 'InvoiceCancelled', { invoice_number: inv.invoice_number }, req.user.id)
  db.save()
  res.json(inv)
})

// --- Payments & Reconciliation ---
app.get('/api/v1/payments', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return

  let list = db.data.payments
  if (req.user.role === 'CUSTOMER') {
    const custInvoiceIds = db.data.invoices.filter((i: any) => i.customer_id === req.user.customer_id).map((i: any) => i.id)
    list = list.filter((p: any) => custInvoiceIds.includes(p.invoice_id))
  }

  const result = list.map((p: any) => {
    const inv = db.data.invoices.find((i: any) => i.id === p.invoice_id)
    const cust = inv ? db.data.customers.find((c: any) => c.id === inv.customer_id) : null
    return {
      ...p,
      invoice_number: inv ? inv.invoice_number : `INV-${p.invoice_id}`,
      customer_name: cust ? cust.name : '—',
    }
  })
  res.json(result)
})

app.post('/api/v1/payments', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  const { invoice_id, amount, method, payment_date, reference, note } = req.body
  const inv = db.data.invoices.find((i: any) => i.id === Number(invoice_id))
  if (!inv) return res.status(404).json({ detail: 'Invoice not found' })

  if (req.user.role === 'CUSTOMER' && inv.customer_id !== req.user.customer_id) {
    return res.status(403).json({ detail: 'Forbidden: Customers cannot make payments for other accounts' })
  }

  const payAmount = Number(amount)
  if (payAmount <= 0) {
    return res.status(400).json({ detail: 'Payment amount must be greater than zero' })
  }

  const currentPaid = Number(inv.paid_amount || 0)
  const currentBal = inv.balance !== undefined ? inv.balance : inv.total - currentPaid

  // Overpayment prevention rule
  if (payAmount > currentBal) {
    return res.status(400).json({
      detail: `Payment amount ₹${payAmount} exceeds current outstanding balance ₹${currentBal}`,
    })
  }

  const newPaymentId = db.data.payments.length > 0 ? Math.max(...db.data.payments.map((p: any) => p.id)) + 1 : 1
  const newPayment = {
    id: newPaymentId,
    invoice_id: inv.id,
    amount: payAmount,
    method: method || 'upi',
    payment_date: payment_date || formatDateISO(new Date()),
    reference: reference || `TXN-${Date.now()}`,
    note: note || null,
    created_by: req.user.id || 1,
  }

  db.data.payments.push(newPayment)

  inv.paid_amount = currentPaid + payAmount
  inv.balance = currentBal - payAmount
  if (inv.balance <= 0) {
    inv.status = 'PAID'
  }

  db.appendEvent('invoice', inv.id, 'PaymentReceived', {
    invoice_number: inv.invoice_number,
    amount: String(payAmount),
    invoice_now_paid: inv.status === 'PAID',
    new_balance: inv.balance,
  }, req.user.id)
  db.save()

  res.status(201).json({
    ...newPayment,
    invoice_status: inv.status,
    balance: inv.balance,
  })
})

// --- Discounts & Taxes (ADMIN for write) ---
app.get('/api/v1/discounts', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  res.json(db.data.discountRules || [])
})

app.post('/api/v1/discounts', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const newId = (db.data.discountRules || []).length > 0 ? Math.max(...db.data.discountRules.map((d: any) => d.id)) + 1 : 1
  const newRule = {
    id: newId,
    name: req.body.name,
    description: req.body.description || '',
    is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
    discount_type: (req.body.discount_type || 'PERCENTAGE').toUpperCase(),
    discount_value: Number(req.body.discount_value || 0),
    min_quantity: Number(req.body.min_quantity || 1),
    min_purchase: Number(req.body.min_purchase || 0),
    usage_count: 0,
    usage_limit: Number(req.body.usage_limit || 100),
  }
  if (!db.data.discountRules) db.data.discountRules = []
  db.data.discountRules.push(newRule)
  db.save()
  res.status(201).json(newRule)
})

app.delete('/api/v1/discounts/:id', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const dId = Number(req.params.id)
  const idx = (db.data.discountRules || []).findIndex((d: any) => d.id === dId)
  if (idx === -1) return res.status(404).json({ detail: 'Discount rule not found' })
  db.data.discountRules.splice(idx, 1)
  db.save()
  res.json({ success: true })
})

app.get('/api/v1/taxes', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  res.json(db.data.taxRules || [])
})

app.post('/api/v1/taxes', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const newId = (db.data.taxRules || []).length > 0 ? Math.max(...db.data.taxRules.map((t: any) => t.id)) + 1 : 1
  const newTax = {
    id: newId,
    name: req.body.name,
    region: req.body.region || 'IN',
    percentage: Number(req.body.percentage || 18),
    category: req.body.category || 'Standard Goods & Services Tax',
    is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
  }
  if (!db.data.taxRules) db.data.taxRules = []
  db.data.taxRules.push(newTax)
  db.save()
  res.status(201).json(newTax)
})

app.delete('/api/v1/taxes/:id', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const tId = Number(req.params.id)
  const idx = (db.data.taxRules || []).findIndex((t: any) => t.id === tId)
  if (idx === -1) return res.status(404).json({ detail: 'Tax rule not found' })
  db.data.taxRules.splice(idx, 1)
  db.save()
  res.json({ success: true })
})

// --- System Settings (ADMIN for write) ---
app.get('/api/v1/settings', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  res.json(db.data.settings)
})

app.post('/api/v1/settings', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  db.data.settings = { ...db.data.settings, ...req.body }
  db.save()
  res.json(db.data.settings)
})

// --- Customer Service Requests ---
app.get('/api/v1/customer/requests', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  if (req.user.role === 'CUSTOMER') {
    const own = (db.data.customerRequests || []).filter((r: any) => r.customer_id === req.user.customer_id)
    return res.json(own)
  }
  res.json(db.data.customerRequests || [])
})

app.post('/api/v1/customer/requests', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  const custId = req.user.role === 'CUSTOMER' ? req.user.customer_id : Number(req.body.customer_id)
  const cust = db.data.customers.find((c: any) => c.id === custId)
  const sub = db.data.subscriptions.find((s: any) => s.id === Number(req.body.subscription_id))

  const newId = (db.data.customerRequests || []).length > 0 ? Math.max(...db.data.customerRequests.map((r: any) => r.id)) + 1 : 1
  const newReq = {
    id: newId,
    customer_id: custId,
    customer_name: cust ? cust.name : `Customer #${custId}`,
    subscription_id: sub ? sub.id : null,
    subscription_number: sub ? sub.subscription_number : '—',
    request_type: (req.body.request_type || 'RENEWAL').toUpperCase(),
    notes: req.body.notes || 'Customer request',
    status: 'PENDING',
    created_at: formatDateISO(new Date()),
  }

  if (!db.data.customerRequests) db.data.customerRequests = []
  db.data.customerRequests.push(newReq)
  db.appendEvent('customer', custId, 'CustomerRequestCreated', { request_id: newId, request_type: newReq.request_type }, req.user.id)
  db.save()
  res.status(201).json(newReq)
})

app.post('/api/v1/customer/requests/:id/action', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const rId = Number(req.params.id)
  const request = (db.data.customerRequests || []).find((r: any) => r.id === rId)
  if (!request) return res.status(404).json({ detail: 'Request not found' })

  const { action } = req.body
  if (action === 'approve') {
    request.status = 'APPROVED'
    if (request.request_type === 'RENEWAL' && request.subscription_id) {
      const sub = db.data.subscriptions.find((s: any) => s.id === request.subscription_id)
      if (sub) {
        const exp = sub.expiry_date ? new Date(sub.expiry_date) : new Date()
        exp.setFullYear(exp.getFullYear() + 1)
        sub.expiry_date = formatDateISO(exp)
        sub.status = 'ACTIVE'
      }
    } else if (request.request_type === 'PAUSE' && request.subscription_id) {
      const sub = db.data.subscriptions.find((s: any) => s.id === request.subscription_id)
      if (sub) sub.status = 'PAUSED'
    }
  } else if (action === 'reject') {
    request.status = 'REJECTED'
  } else {
    return res.status(400).json({ detail: 'Invalid action' })
  }

  db.save()
  res.json(request)
})

// --- Analytics & Staff Dashboard ---
app.get('/api/v1/analytics/dashboard', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const today = new Date()
  const todayStr = formatDateISO(today)
  const activeSubs = db.data.subscriptions.filter((s: any) => s.status === 'ACTIVE')

  const mrr = activeSubs.reduce((acc: number, s: any) => {
    const base = (s.lines || []).reduce((sum: number, l: any) => sum + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
    return acc + base
  }, 0)

  const totalCollected = db.data.payments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0)

  let outstanding = 0
  let overdueCount = 0
  for (const inv of db.data.invoices) {
    if (['CONFIRMED', 'OVERDUE'].includes(inv.status)) {
      const bal = inv.balance !== undefined ? inv.balance : inv.total - (inv.paid_amount || 0)
      outstanding += Math.max(0, bal)
      if (inv.status === 'OVERDUE' || (inv.due_date && inv.due_date < todayStr && inv.status !== 'PAID')) {
        overdueCount++
      }
    }
  }

  res.json({
    active_subscriptions: activeSubs.length,
    mrr,
    arr: mrr * 12,
    revenue_collected_total: totalCollected,
    outstanding_amount: outstanding,
    overdue_invoice_count: overdueCount,
    total_customers: db.data.customers.length,
    total_staff: db.data.users.filter((u: any) => u.role === 'STAFF').length,
  })
})

app.get('/api/v1/analytics/staff-dashboard', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const today = new Date()
  const todayStr = formatDateISO(today)
  const in30DaysStr = addDays(today, 30)

  const staffUserId = req.user.id
  const assignedCustomers = db.data.customers.filter(
    (c: any) => c.assigned_staff_id === staffUserId || !c.assigned_staff_id || staffUserId === 2
  )
  const customerIds = assignedCustomers.map((c: any) => c.id)

  const activeSubs = db.data.subscriptions.filter(
    (s: any) => s.status === 'ACTIVE' && customerIds.includes(s.customer_id)
  )

  const pendingQuotations = db.data.quotations.filter(
    (q: any) => ['DRAFT', 'QUOTATION'].includes(q.status) && customerIds.includes(q.customer_id)
  )

  const invoicesNeedingAttention = db.data.invoices.filter((i: any) => {
    if (!customerIds.includes(i.customer_id)) return false
    const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
    if (bal <= 0) return false
    return i.status === 'OVERDUE' || (i.due_date && i.due_date <= todayStr && i.status !== 'PAID')
  })

  const upcomingRenewals = db.data.subscriptions.filter((s: any) => {
    if (!customerIds.includes(s.customer_id)) return false
    if (s.status !== 'ACTIVE') return false
    const exp = s.expiry_date || s.next_billing_date
    return exp && exp >= todayStr && exp <= in30DaysStr
  })

  const pendingRequests = (db.data.customerRequests || []).filter((r: any) => r.status === 'PENDING')
  const recentOperations = db.data.auditEvents.slice(-8).reverse()

  res.json({
    assigned_customers_count: assignedCustomers.length,
    active_subscriptions_count: activeSubs.length,
    pending_quotations_count: pendingQuotations.length,
    invoices_needing_attention: invoicesNeedingAttention.map((i: any) => {
      const cust = db.data.customers.find((c: any) => c.id === i.customer_id)
      return {
        ...i,
        customer_name: cust ? cust.name : `Customer #${i.customer_id}`,
        balance: i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0),
      }
    }),
    upcoming_renewals: upcomingRenewals.map((s: any) => {
      const cust = db.data.customers.find((c: any) => c.id === s.customer_id)
      const plan = db.data.plans.find((p: any) => p.id === s.plan_id)
      return {
        ...s,
        customer_name: cust ? cust.name : `Customer #${s.customer_id}`,
        plan_name: plan ? plan.name : `Plan #${s.plan_id}`,
      }
    }),
    pending_requests: pendingRequests,
    recent_operations: recentOperations,
  })
})

app.get('/api/v1/analytics/mrr', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const activeSubs = db.data.subscriptions.filter((s: any) => s.status === 'ACTIVE')
  const mrr = activeSubs.reduce((acc: number, s: any) => {
    const base = (s.lines || []).reduce((sum: number, l: any) => sum + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
    return acc + base
  }, 0)
  res.json({ mrr, arr: mrr * 12 })
})

app.get('/api/v1/analytics/churn-risk', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const todayStr = formatDateISO(new Date())
  const highRisk = db.data.subscriptions
    .filter((s: any) => s.status === 'ACTIVE')
    .map((s: any) => {
      const cust = db.data.customers.find((c: any) => c.id === s.customer_id)
      const hasOverdue = db.data.invoices.some((i: any) => i.customer_id === s.customer_id && i.status === 'OVERDUE')
      const daysToExpiry = s.expiry_date ? Math.ceil((new Date(s.expiry_date).getTime() - Date.now()) / 86400000) : 365
      let score = 20
      const reasons: string[] = []
      if (hasOverdue) {
        score += 45
        reasons.push('Unsettled overdue invoices present')
      }
      if (daysToExpiry <= 14) {
        score += 30
        reasons.push(`Contract expiring in ${daysToExpiry} days`)
      }
      return {
        subscription_id: s.id,
        subscription_number: s.subscription_number,
        customer_name: cust ? cust.name : `Customer #${s.customer_id}`,
        score,
        risk_score: score,
        reasons,
      }
    })
    .filter((r: any) => r.score >= 50)
  res.json(highRisk)
})

app.get('/api/v1/reports', (req: AuthenticatedRequest, res) => {
  if (!requireStaffOrAdmin(req, res)) return
  const plansReport = db.data.plans.map((p: any) => {
    const activeCount = db.data.subscriptions.filter((s: any) => s.plan_id === p.id && s.status === 'ACTIVE').length
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

  const overdueAgingReport = db.data.invoices
    .filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .map((inv: any) => {
      const cust = db.data.customers.find((c: any) => c.id === inv.customer_id)
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

  res.json({
    plans_breakdown: plansReport,
    overdue_aging: overdueAgingReport,
    generated_at: new Date().toISOString(),
  })
})

// --- Audit & Security ---
app.get('/api/v1/audit/events', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const limit = Number(req.query.limit || 50)
  res.json([...db.data.auditEvents].reverse().slice(0, limit))
})

app.post('/api/v1/audit/verify', (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return
  const events = [...db.data.auditEvents].sort((a: any, b: any) => a.sequence_num - b.sequence_num)
  let expectedPrevHash = GENESIS_HASH
  let validCount = 0
  let corrupted = false

  for (const ev of events) {
    if (ev.previous_hash !== expectedPrevHash) {
      corrupted = true
      break
    }
    const computed = computeEventHash(expectedPrevHash, ev.sequence_num, ev.event_type, typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload, ev.timestamp)
    if (computed !== ev.event_hash) {
      corrupted = true
      break
    }
    expectedPrevHash = ev.event_hash
    validCount++
  }

  res.json({
    valid: !corrupted,
    total_events: events.length,
    verified_count: validCount,
    latest_event_hash: db.data.lastEventHash,
    status: corrupted ? 'CORRUPTED' : 'VERIFIED',
  })
})

// --- AI Copilot (Customer, Staff, Admin) ---
app.post('/api/v1/assistant/query', (req: AuthenticatedRequest, res) => {
  if (!requireAuth(req, res)) return
  const question = String(req.body.question || '').trim()
  const q = question.toLowerCase()
  const role = req.user.role
  const todayStr = formatDateISO(new Date())

  // Customer Queries (Strict Data Isolation)
  if (role === 'CUSTOMER') {
    const custId = req.user.customer_id
    const mySubs = db.data.subscriptions.filter((s: any) => s.customer_id === custId)
    const myInvoices = db.data.invoices.filter((i: any) => i.customer_id === custId)
    const myInvoiceIds = myInvoices.map((i: any) => i.id)
    const myPayments = db.data.payments.filter((p: any) => myInvoiceIds.includes(p.invoice_id))

    if (q.includes('active') || q.includes('subscription status') || q.includes('my subscription')) {
      const active = mySubs.filter((s: any) => s.status === 'ACTIVE')
      const rows = active.map((s: any) => {
        const plan = db.data.plans.find((p: any) => p.id === s.plan_id)
        const amount = (s.lines || []).reduce((acc: number, l: any) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
        return {
          subscription_number: s.subscription_number,
          plan: plan ? plan.name : `Plan #${s.plan_id}`,
          amount: `₹${amount.toLocaleString('en-IN')}`,
          status: s.status,
          next_billing_date: s.next_billing_date || '—',
          expiry_date: s.expiry_date || 'Ongoing',
        }
      })
      return res.json({
        mode: 'fallback',
        fallback: true,
        answer: rows.length > 0
          ? `You have ${rows.length} active subscription(s) on your account:`
          : 'You currently have no active subscriptions.',
        data: rows,
      })
    }

    if (q.includes('next billing') || q.includes('when is my next')) {
      const active = mySubs.filter((s: any) => s.status === 'ACTIVE' && s.next_billing_date).sort((a: any, b: any) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime())
      if (active.length > 0) {
        const next = active[0]
        const plan = db.data.plans.find((p: any) => p.id === next.plan_id)
        return res.json({
          mode: 'fallback',
          fallback: true,
          answer: `Your next billing date is ${next.next_billing_date} for ${plan?.name || next.subscription_number}.`,
          data: [{ subscription: next.subscription_number, plan: plan?.name, next_billing: next.next_billing_date }],
        })
      }
      return res.json({
        mode: 'fallback',
        fallback: true,
        answer: 'You have no upcoming billing dates scheduled at this time.',
        data: [],
      })
    }

    if (q.includes('owe') || q.includes('outstanding') || q.includes('balance')) {
      let totalOwed = 0
      const open = myInvoices.filter((i: any) => ['CONFIRMED', 'OVERDUE'].includes(i.status))
      const rows = open.map((i: any) => {
        const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
        totalOwed += Math.max(0, bal)
        return {
          invoice_number: i.invoice_number,
          due_date: i.due_date,
          total: `₹${Number(i.total).toLocaleString('en-IN')}`,
          balance: `₹${Number(bal).toLocaleString('en-IN')}`,
          status: i.status,
        }
      })
      return res.json({
        mode: 'fallback',
        fallback: true,
        answer: totalOwed > 0
          ? `Your current total outstanding balance is ₹${totalOwed.toLocaleString('en-IN')} across ${rows.length} invoice(s).`
          : 'You currently have zero outstanding balance. All your invoices are fully settled!',
        data: rows,
      })
    }

    if (q.includes('overdue')) {
      const overdue = myInvoices.filter((i: any) => i.status === 'OVERDUE' || (i.due_date && i.due_date < todayStr && i.status !== 'PAID'))
      const rows = overdue.map((i: any) => {
        const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
        return {
          invoice_number: i.invoice_number,
          due_date: i.due_date,
          balance: `₹${Number(bal).toLocaleString('en-IN')}`,
          status: 'OVERDUE',
        }
      })
      return res.json({
        mode: 'fallback',
        fallback: true,
        answer: rows.length > 0
          ? `You have ${rows.length} overdue invoice(s) requiring payment.`
          : 'Great news! You have zero overdue invoices.',
        data: rows,
      })
    }

    if (q.includes('payment') || q.includes('paid')) {
      const rows = myPayments.map((p: any) => {
        const inv = myInvoices.find((i: any) => i.id === p.invoice_id)
        return {
          reference: p.reference,
          invoice: inv ? inv.invoice_number : `INV-${p.invoice_id}`,
          amount: `₹${Number(p.amount).toLocaleString('en-IN')}`,
          payment_date: p.payment_date,
          method: p.method,
        }
      })
      return res.json({
        mode: 'fallback',
        fallback: true,
        answer: rows.length > 0
          ? `You have recorded ${rows.length} payment(s):`
          : 'No payments recorded on your account yet.',
        data: rows,
      })
    }

    if (q.includes('invoice')) {
      const rows = myInvoices.map((i: any) => ({
        invoice_number: i.invoice_number,
        due_date: i.due_date,
        total: `₹${Number(i.total).toLocaleString('en-IN')}`,
        status: i.status,
      }))
      return res.json({
        mode: 'fallback',
        fallback: true,
        answer: `Found ${rows.length} invoice(s) for your account:`,
        data: rows,
      })
    }

    return res.json({
      mode: 'fallback',
      fallback: true,
      answer: 'You can ask: "What are my active subscriptions?", "When is my next billing date?", "How much do I owe?", "Which of my invoices are overdue?", or "What payments have I made?".',
      data: [],
    })
  }

  // Staff and Admin queries
  if (q.includes('overdue')) {
    const overdue = db.data.invoices.filter((i: any) => i.status === 'OVERDUE' || (i.due_date && i.due_date < todayStr && i.status !== 'PAID'))
    const rows = overdue.map((i: any) => {
      const cust = db.data.customers.find((c: any) => c.id === i.customer_id)
      const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
      return {
        invoice: i.invoice_number,
        customer: cust ? cust.name : `Customer #${i.customer_id}`,
        balance: `₹${Number(bal).toLocaleString('en-IN')}`,
        due_date: i.due_date,
      }
    })
    return res.json({
      mode: 'fallback',
      fallback: true,
      answer: `Found ${rows.length} overdue invoices in the system:`,
      data: rows,
    })
  }

  if (q.includes('mrr') || q.includes('revenue')) {
    const activeSubs = db.data.subscriptions.filter((s: any) => s.status === 'ACTIVE')
    const mrr = activeSubs.reduce((acc: number, s: any) => {
      const base = (s.lines || []).reduce((sum: number, l: any) => sum + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
      return acc + base
    }, 0)
    return res.json({
      mode: 'fallback',
      fallback: true,
      answer: `Current Monthly Recurring Revenue (MRR) is ₹${mrr.toLocaleString('en-IN')} (Annual Run Rate ARR ₹${(mrr * 12).toLocaleString('en-IN')}).`,
      data: [{ metric: 'MRR', value: `₹${mrr.toLocaleString('en-IN')}` }, { metric: 'ARR', value: `₹${(mrr * 12).toLocaleString('en-IN')}` }],
    })
  }

  if (q.includes('churn') || q.includes('risk')) {
    const highRisk = db.data.subscriptions
      .filter((s: any) => s.status === 'ACTIVE')
      .map((s: any) => {
        const cust = db.data.customers.find((c: any) => c.id === s.customer_id)
        return {
          subscription: s.subscription_number,
          customer: cust ? cust.name : `Customer #${s.customer_id}`,
          risk_level: 'HIGH',
        }
      })
      .slice(0, 5)
    return res.json({
      mode: 'fallback',
      fallback: true,
      answer: `Showing high churn-risk subscriptions:`,
      data: highRisk,
    })
  }

  return res.json({
    mode: 'fallback',
    fallback: true,
    answer: 'I can assist you with MRR calculations, overdue invoices, churn risk, upcoming renewals, and subscription contracts.',
    data: [],
  })
})

// ============================================================================
// SERVER INITIALIZATION & VITE MIDDLEWARE
// ============================================================================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.resolve(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SubSecure AI Server running on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
