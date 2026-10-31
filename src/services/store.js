/**
 * Core business engine & in-memory/localStorage store for SubSecure AI.
 * Implements complete RBAC (Admin, Staff, Customer), deterministic SHA-256 audit ledger,
 * recurring billing simulation and execution, templates, discounts & taxes,
 * customer requests, and full AI Finance & Operations Copilot with Gemini integration.
 */

import { computeEventHash } from '../utils/crypto'

const STORAGE_KEY = 'subsecure_data_v2'
const GENESIS_HASH = '0'.repeat(64)

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDateISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function buildInitialData() {
  const today = new Date()
  const todayStr = formatDateISO(today)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStartStr = formatDateISO(monthStart)

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthStartStr = formatDateISO(lastMonthStart)

  const monthKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`
  const lastMonthKey = `${lastMonthStart.getFullYear()}-${pad2(lastMonthStart.getMonth() + 1)}`

  const addDays = (d, n) => {
    const res = new Date(d)
    res.setDate(res.getDate() + n)
    return formatDateISO(res)
  }

  const customers = [
    { id: 1, name: 'Acme Technologies', email: 'billing@acme.io', company: 'Acme Technologies', region: 'IN-South', assigned_staff_id: 2 },
    { id: 2, name: 'Northstar Retail', email: 'it@northstar.example', company: 'Northstar Retail', region: 'IN-North', assigned_staff_id: 2 },
    { id: 3, name: 'PixelWorks', email: 'ops@pixelworks.example', company: 'PixelWorks Studio', region: 'IN-West', assigned_staff_id: 2 },
    { id: 4, name: 'Bluemont Logistics', email: 'finance@bluemont.example', company: 'Bluemont Logistics', region: 'IN-South', assigned_staff_id: 2 },
    { id: 5, name: 'Cider & Co', email: 'hello@cider.example', company: 'Cider & Co', region: 'IN-East', assigned_staff_id: 2 },
  ]

  const users = [
    { id: 1, name: 'Kirthi Admin', email: 'admin@brightloop.io', password: 'Admin@12345', role: 'ADMIN', customer_id: null, is_active: true, created_at: addDays(today, -60) },
    { id: 2, name: 'Yogesh Staff', email: 'staff@brightloop.io', password: 'Staff@12345', role: 'STAFF', customer_id: null, is_active: true, created_at: addDays(today, -50) },
    { id: 3, name: 'Acme Customer', email: 'customer@acme.io', password: 'Customer@12345', role: 'CUSTOMER', customer_id: 1, is_active: true, created_at: addDays(today, -45) },
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
      is_active: true,
      allow_pause: true,
      allow_early_close: false,
      allow_renewal: true,
      auto_close: false,
    },
    {
      id: 2,
      name: 'CRM Yearly',
      product_id: 1,
      price: 54000,
      billing_interval: 'YEARLY',
      minimum_quantity: 1,
      is_active: true,
      allow_pause: true,
      allow_early_close: false,
      allow_renewal: true,
      auto_close: false,
    },
    {
      id: 3,
      name: 'Analytics Monthly',
      product_id: 2,
      price: 8000,
      billing_interval: 'MONTHLY',
      minimum_quantity: 1,
      is_active: true,
      allow_pause: true,
      allow_early_close: false,
      allow_renewal: true,
      auto_close: false,
    },
    {
      id: 4,
      name: 'Support Weekly',
      product_id: 3,
      price: 1500,
      billing_interval: 'WEEKLY',
      minimum_quantity: 1,
      is_active: true,
      allow_pause: true,
      allow_early_close: false,
      allow_renewal: true,
      auto_close: false,
    },
    {
      id: 5,
      name: 'Onboarding Daily',
      product_id: 4,
      price: 300,
      billing_interval: 'DAILY',
      minimum_quantity: 1,
      is_active: true,
      allow_pause: false,
      allow_early_close: true,
      allow_renewal: false,
      auto_close: true,
    },
  ]

  const templates = [
    {
      id: 1,
      name: 'Starter SaaS Bundle',
      description: 'Quick-start package with 2 CRM seats and full onboarding setup.',
      plan_id: 1,
      product_id: 1,
      default_quantity: 2,
      tax_percent: 18,
      discount_percent: 0,
      valid_days: 15,
      lines: [
        { product_id: 1, quantity: 2, unit_price: 5000, product_name: 'Brightloop CRM' },
        { product_id: 4, quantity: 1, unit_price: 3000, product_name: 'Onboarding Package' },
      ],
    },
    {
      id: 2,
      name: 'Enterprise Growth Pack',
      description: '12 CRM seats with 24/7 Priority Support and 10% volume discount.',
      plan_id: 1,
      product_id: 1,
      default_quantity: 12,
      tax_percent: 18,
      discount_percent: 10,
      valid_days: 30,
      lines: [
        { product_id: 1, quantity: 12, unit_price: 5000, product_name: 'Brightloop CRM' },
        { product_id: 3, quantity: 1, unit_price: 1500, product_name: 'Priority Support Add-on' },
      ],
    },
    {
      id: 3,
      name: 'Annual Corporate Suite',
      description: 'Full-year CRM commitment paired with monthly Analytics.',
      plan_id: 2,
      product_id: 1,
      default_quantity: 5,
      tax_percent: 18,
      discount_percent: 5,
      valid_days: 45,
      lines: [
        { product_id: 1, quantity: 5, unit_price: 54000, product_name: 'Brightloop CRM' },
        { product_id: 2, quantity: 2, unit_price: 8000, product_name: 'Brightloop Analytics' },
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
      conditions: [{ field: 'quantity', operator: 'gte', value: 10 }],
      action: { type: 'percentage', value: 15 },
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
      conditions: [{ field: 'subtotal', operator: 'gte', value: 20000 }],
      action: { type: 'fixed', value: 1000 },
      usage_count: 1,
      usage_limit: 50,
    },
  ]

  const taxRules = [
    { id: 1, name: 'Prototype GST 18%', region: 'IN', percentage: 18, is_active: true, category: 'Standard Goods & Services Tax' },
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
    {
      id: 6,
      subscription_number: 'SUB-1006',
      customer_id: 4,
      plan_id: 3,
      start_date: addDays(today, -90),
      expiry_date: addDays(today, -10),
      next_billing_date: null,
      payment_terms: 'net_15',
      status: 'CLOSED',
      created_at: addDays(today, -90),
      lines: [
        { id: 7, product_id: 2, variant_id: null, quantity: 2, unit_price: 8000, product_name: 'Brightloop Analytics' },
      ],
    },
    {
      id: 7,
      subscription_number: 'SUB-1007',
      customer_id: 2,
      plan_id: 4,
      start_date: lastMonthStartStr,
      expiry_date: addDays(today, 100),
      next_billing_date: monthStartStr,
      payment_terms: 'net_15',
      status: 'ACTIVE',
      created_at: addDays(today, -20),
      lines: [
        { id: 8, product_id: 3, variant_id: null, quantity: 80, unit_price: 1500, product_name: 'Priority Support Add-on' },
      ],
    },
    {
      id: 8,
      subscription_number: 'SUB-1008',
      customer_id: 5,
      plan_id: 5,
      start_date: todayStr,
      expiry_date: addDays(today, 60),
      next_billing_date: todayStr,
      payment_terms: 'immediate',
      status: 'CONFIRMED',
      created_at: todayStr,
      lines: [
        { id: 9, product_id: 4, variant_id: null, quantity: 1, unit_price: 300, product_name: 'Onboarding Package' },
      ],
    },
    {
      id: 9,
      subscription_number: 'SUB-1009',
      customer_id: 3,
      plan_id: 1,
      start_date: todayStr,
      expiry_date: null,
      next_billing_date: null,
      payment_terms: 'net_15',
      status: 'DRAFT',
      created_at: todayStr,
      lines: [
        { id: 10, product_id: 1, variant_id: null, quantity: 1, unit_price: 5000, product_name: 'Brightloop CRM' },
      ],
    },
    {
      id: 10,
      subscription_number: 'SUB-1010',
      customer_id: 1,
      plan_id: 1,
      start_date: addDays(today, -5),
      expiry_date: addDays(today, 360),
      next_billing_date: addDays(today, 25),
      payment_terms: 'net_15',
      status: 'ACTIVE',
      created_at: addDays(today, -5),
      lines: [
        { id: 11, product_id: 1, variant_id: 1, quantity: 3, unit_price: 5560, product_name: 'Brightloop CRM (Odoo Brand)' },
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
    {
      id: 2,
      quotation_number: 'QUO-1002',
      customer_id: 5,
      plan_id: 1,
      valid_until: addDays(today, 15),
      tax_percent: 18,
      discount_percent: 0,
      status: 'CONFIRMED',
      lines: [
        { id: 2, product_id: 1, quantity: 2, unit_price: 5000, product_name: 'Brightloop CRM' },
      ],
      subtotal: 10000,
      discount_total: 0,
      tax_total: 1800,
      total: 11800,
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
      billing_period_end: addDays(lastMonthStart, 27),
      issue_date: lastMonthStartStr,
      due_date: addDays(lastMonthStart, 14),
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
      invoice_number: `INV-SUB-1002-${lastMonthKey}-NS`,
      subscription_id: 2,
      customer_id: 2,
      billing_period_key: `${lastMonthKey}-NS`,
      billing_period_start: addDays(lastMonthStart, -40),
      billing_period_end: addDays(lastMonthStart, -20),
      issue_date: addDays(lastMonthStart, -40),
      due_date: addDays(lastMonthStart, -26),
      subtotal: 22500,
      discount_total: 1000,
      tax_total: 3870,
      total: 25370,
      paid_amount: 0,
      balance: 25370,
      status: 'OVERDUE',
      lines: [
        { id: 2, product_id: 1, description: 'Subscription SUB-1002 - CRM Yearly slice', quantity: 5, unit_price: 4500, tax_amount: 3870, line_total: 22500 },
      ],
    },
    {
      id: 3,
      invoice_number: `INV-SUB-1003-${lastMonthKey}-PW`,
      subscription_id: 3,
      customer_id: 3,
      billing_period_key: `${lastMonthKey}-PW`,
      billing_period_start: lastMonthStartStr,
      billing_period_end: addDays(lastMonthStart, 28),
      issue_date: lastMonthStartStr,
      due_date: addDays(today, 10),
      subtotal: 25500,
      discount_total: 1000,
      tax_total: 4410,
      total: 28910,
      paid_amount: 0,
      balance: 28910,
      status: 'CONFIRMED',
      lines: [
        { id: 3, product_id: 2, description: 'Subscription SUB-1003 - Brightloop Analytics', quantity: 3, unit_price: 8000, tax_amount: 4140, line_total: 24000 },
        { id: 4, product_id: 3, description: 'Subscription SUB-1003 - Priority Support Add-on', quantity: 1, unit_price: 1500, tax_amount: 270, line_total: 1500 },
      ],
    },
    {
      id: 4,
      invoice_number: `INV-SUB-1001-${lastMonthKey}-ADDON`,
      subscription_id: 1,
      customer_id: 1,
      billing_period_key: `${lastMonthKey}-ADDON`,
      billing_period_start: lastMonthStartStr,
      billing_period_end: addDays(lastMonthStart, 28),
      issue_date: lastMonthStartStr,
      due_date: addDays(today, 8),
      subtotal: 12000,
      discount_total: 0,
      tax_total: 2160,
      total: 14160,
      paid_amount: 7080,
      balance: 7080,
      status: 'CONFIRMED',
      lines: [
        { id: 5, product_id: 3, description: 'Add-on capacity slice', quantity: 8, unit_price: 1500, tax_amount: 2160, line_total: 12000 },
      ],
    },
    {
      id: 5,
      invoice_number: `INV-SUB-1007-${monthKey}-DRAFT`,
      subscription_id: 7,
      customer_id: 2,
      billing_period_key: `${monthKey}-DRAFT`,
      billing_period_start: monthStartStr,
      billing_period_end: addDays(monthStart, 29),
      issue_date: todayStr,
      due_date: addDays(today, 14),
      subtotal: 120000,
      discount_total: 18000,
      tax_total: 18360,
      total: 120360,
      paid_amount: 0,
      balance: 120360,
      status: 'DRAFT',
      lines: [
        { id: 6, product_id: 3, description: 'Bulk Support Weekly (x80)', quantity: 80, unit_price: 1500, tax_amount: 18360, line_total: 120000 },
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
    {
      id: 2,
      invoice_id: 4,
      amount: 7080,
      method: 'upi',
      payment_date: addDays(today, -2),
      reference: 'SEED-PARTIAL-UPI-992',
      note: 'Seeded partial payment (simulated)',
      created_by: 2,
    },
  ]

  const securityAlerts = [
    {
      id: 1,
      alert_type: 'DUPLICATE_BILLING_ATTEMPT',
      severity: 'LOW',
      title: 'Duplicate Billing Guard',
      description: `Duplicate billing attempt blocked for SUB-1001 period ${lastMonthKey}`,
      related_entity_type: 'subscription',
      related_entity_id: '1',
      resolved: false,
      created_at: addDays(today, -1),
    },
    {
      id: 2,
      alert_type: 'ANOMALY_SEAT_SPIKE',
      severity: 'HIGH',
      title: 'Seat Volume Anomaly',
      description: 'Subscription SUB-1007 increased seat quantity to 80 (delta +₹21,600/mo)',
      related_entity_type: 'subscription',
      related_entity_id: '7',
      resolved: false,
      created_at: addDays(today, -3),
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
    geminiApiKeyConfigured: false,
    deterministicFallbackAlwaysActive: true,
    securityThresholds: {
      excessiveDiscountPercent: 50,
      unusualQuantityThreshold: 50,
      highChurnRiskScore: 60,
    },
  }

  const idempotencyKeys = {
    [`1_${lastMonthKey}`]: 1,
    [`2_${lastMonthKey}-NS`]: 2,
    [`3_${lastMonthKey}-PW`]: 3,
    [`1_${lastMonthKey}-ADDON`]: 4,
  }

  const rawEvents = [
    { seq: 1, type: 'UserCreated', aggType: 'user', aggId: '1', payload: { email: 'admin@brightloop.io', role: 'ADMIN' }, actor: 1, time: addDays(today, -50) },
    { seq: 2, type: 'UserCreated', aggType: 'user', aggId: '2', payload: { email: 'staff@brightloop.io', role: 'STAFF' }, actor: 1, time: addDays(today, -50) },
    { seq: 3, type: 'UserCreated', aggType: 'user', aggId: '3', payload: { email: 'customer@acme.io', role: 'CUSTOMER' }, actor: 1, time: addDays(today, -50) },
    { seq: 4, type: 'ProductCreated', aggType: 'product', aggId: '1', payload: { name: 'Brightloop CRM', sales_price: '5000' }, actor: 1, time: addDays(today, -48) },
    { seq: 5, type: 'PlanCreated', aggType: 'plan', aggId: '1', payload: { name: 'CRM Enterprise Monthly', price: '5000', interval: 'MONTHLY' }, actor: 1, time: addDays(today, -48) },
    { seq: 6, type: 'SubscriptionCreated', aggType: 'subscription', aggId: '1', payload: { subscription_number: 'SUB-1001', customer_id: 1, plan_id: 1 }, actor: 1, time: addDays(today, -45) },
    { seq: 7, type: 'SubscriptionActivated', aggType: 'subscription', aggId: '1', payload: { from: 'CONFIRMED', to: 'ACTIVE', subscription_number: 'SUB-1001' }, actor: 1, time: addDays(today, -45) },
    { seq: 8, type: 'SubscriptionQuantityChanged', aggType: 'subscription', aggId: '7', payload: { subscription_number: 'SUB-1007', old_quantity: 8, new_quantity: 80, monthly_delta: '21600.00' }, actor: 1, time: addDays(today, -20) },
    { seq: 9, type: 'InvoiceGenerated', aggType: 'invoice', aggId: '1', payload: { invoice_number: `INV-SUB-1001-${lastMonthKey}`, billing_period_key: lastMonthKey, total: '60180' }, actor: 1, time: lastMonthStartStr },
    { seq: 10, type: 'PaymentReceived', aggType: 'invoice', aggId: '1', payload: { invoice_number: `INV-SUB-1001-${lastMonthKey}`, amount: '60180', invoice_now_paid: true }, actor: 1, time: addDays(lastMonthStart, 4) },
    { seq: 11, type: 'PaymentReceived', aggType: 'invoice', aggId: '4', payload: { invoice_number: `INV-SUB-1001-${lastMonthKey}-ADDON`, amount: '7080', invoice_now_paid: false }, actor: 2, time: addDays(today, -2) },
  ]

  let prevHash = GENESIS_HASH
  const auditEvents = []
  rawEvents.forEach((ev, idx) => {
    const eventId = `evt-seed-${idx + 1}`
    const canonicalPayload = JSON.stringify(ev.payload)
    const content = {
      sequence_num: ev.seq,
      event_id: eventId,
      aggregate_type: ev.aggType,
      aggregate_id: String(ev.aggId),
      event_type: ev.type,
      payload: canonicalPayload,
      actor_user_id: ev.actor,
      timestamp: `${ev.time}T10:00:00.000000Z`,
      previous_hash: prevHash,
    }
    const hash = computeEventHash(content)
    auditEvents.push({
      ...content,
      event_hash: hash,
    })
    prevHash = hash
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
    securityAlerts,
    customerRequests,
    settings,
    idempotencyKeys,
    auditEvents,
    lastVerifiedAt: null,
  }
}

class Store {
  constructor() {
    this.data = this.load()
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.users && parsed.templates && parsed.settings) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    const initial = buildInitialData()
    this.save(initial)
    return initial
  }

  save(data = this.data) {
    this.data = data
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
  }

  reset() {
    const fresh = buildInitialData()
    this.save(fresh)
    return fresh
  }

  // --- Audit Ledger Service ---
  appendEvent({ aggregateType, aggregateId, eventType, payload, actorUserId = null }) {
    const events = this.data.auditEvents
    const last = events[events.length - 1]
    const sequenceNum = last ? last.sequence_num + 1 : 1
    const previousHash = last ? last.event_hash : GENESIS_HASH
    const timestamp = new Date().toISOString()
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const canonicalPayload = typeof payload === 'string' ? payload : JSON.stringify(payload)

    const content = {
      sequence_num: sequenceNum,
      event_id: eventId,
      aggregate_type: aggregateType,
      aggregate_id: String(aggregateId),
      event_type: eventType,
      payload: canonicalPayload,
      actor_user_id: actorUserId,
      timestamp,
      previous_hash: previousHash,
    }

    const eventHash = computeEventHash(content)
    const newEvent = { ...content, event_hash: eventHash }
    this.data.auditEvents.push(newEvent)
    this.save()
    return newEvent
  }

  verifyAuditChain() {
    const events = this.data.auditEvents
    let previousHash = GENESIS_HASH
    let expectedSeq = 1

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]
      if (ev.sequence_num !== expectedSeq) {
        return {
          valid: false,
          checked_events: events.length,
          first_invalid_sequence: ev.sequence_num,
          message: `Sequence gap or reordering detected at sequence ${ev.sequence_num}`,
        }
      }
      if (ev.previous_hash !== previousHash) {
        return {
          valid: false,
          checked_events: events.length,
          first_invalid_sequence: ev.sequence_num,
          message: 'Previous-hash link broken',
        }
      }
      const content = {
        sequence_num: ev.sequence_num,
        event_id: ev.event_id,
        aggregate_type: ev.aggregate_type,
        aggregate_id: ev.aggregate_id,
        event_type: ev.event_type,
        payload: ev.payload,
        actor_user_id: ev.actor_user_id,
        timestamp: ev.timestamp,
        previous_hash: ev.previous_hash,
      }
      if (computeEventHash(content) !== ev.event_hash) {
        return {
          valid: false,
          checked_events: events.length,
          first_invalid_sequence: ev.sequence_num,
          message: 'Hash mismatch detected',
        }
      }
      previousHash = ev.event_hash
      expectedSeq += 1
    }

    this.data.lastVerifiedAt = new Date().toISOString()
    this.save()

    return {
      valid: true,
      checked_events: events.length,
      total_events: events.length,
      event_count: events.length,
      latest_hash: previousHash,
      verified_at: this.data.lastVerifiedAt,
      first_invalid_sequence: null,
      message: 'Audit chain verified',
    }
  }

  // --- Calculations: Discounts & Tax ---
  computeSubscriptionPreview(sub) {
    let subtotal = 0
    const lines = (sub.lines || []).map((l) => {
      const lineTotal = Number(l.quantity || 1) * Number(l.unit_price || 0)
      subtotal += lineTotal
      return {
        product_id: l.product_id,
        description: `Subscription ${sub.subscription_number} - ${l.product_name || `Product #${l.product_id}`}`,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_total: lineTotal,
      }
    })

    const totalQty = (sub.lines || []).reduce((acc, l) => acc + Number(l.quantity || 0), 0)
    let discountTotal = 0
    const appliedRules = []

    for (const rule of this.data.discountRules) {
      if (!rule.is_active) continue
      let matches = true
      if (rule.min_quantity && totalQty < rule.min_quantity) matches = false
      if (rule.min_purchase && subtotal < rule.min_purchase) matches = false
      for (const cond of rule.conditions || []) {
        if (cond.field === 'quantity') {
          if (cond.operator === 'gte' && !(totalQty >= Number(cond.value))) matches = false
        }
        if (cond.field === 'subtotal') {
          if (cond.operator === 'gte' && !(subtotal >= Number(cond.value))) matches = false
        }
      }
      if (matches) {
        let disc = 0
        const actionType = rule.action?.type || (rule.discount_type || '').toLowerCase()
        const actionVal = rule.action?.value || rule.discount_value || 0
        if (actionType === 'percentage') {
          disc = subtotal * (Number(actionVal) / 100)
        } else if (actionType === 'fixed') {
          disc = Number(actionVal)
        }
        discountTotal += disc
        appliedRules.push(rule.name)
      }
    }

    discountTotal = Math.min(discountTotal, subtotal)
    const taxable = subtotal - discountTotal
    const taxRule = this.data.taxRules.find((t) => t.is_active)
    const taxPercent = taxRule ? Number(taxRule.percentage) : 18
    const taxTotal = Math.round(taxable * (taxPercent / 100))
    const total = taxable + taxTotal

    return {
      lines,
      subtotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      total,
      applied_rules: appliedRules,
    }
  }

  // --- Billing Simulation ---
  simulateBilling(periodKey) {
    const today = new Date()
    const pKey = periodKey || `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`
    const [pYear, pMonth] = pKey.split('-').map(Number)
    const periodEndStr = formatDateISO(new Date(pYear, pMonth, 0))
    const periodStartStr = `${pKey}-01`

    const subs = this.data.subscriptions
    const items = []
    const warnings = []
    let ready = 0
    let skipped = 0
    let blocked = 0
    let expectedTotal = 0
    let taxTotal = 0
    let discountTotal = 0

    for (const sub of subs) {
      const customer = this.data.customers.find((c) => c.id === sub.customer_id)
      const item = {
        subscription_id: sub.id,
        subscription_number: sub.subscription_number,
        customer_id: sub.customer_id,
        customer_name: customer ? customer.name : `Customer #${sub.customer_id}`,
        status: null,
        reason: null,
        subtotal: null,
        discount_total: null,
        tax_total: null,
        total: null,
        anomaly_flags: [],
      }

      const idempotencyKey = `${sub.id}_${pKey}`
      const isAlreadyBilled = Boolean(this.data.idempotencyKeys[idempotencyKey])

      if (sub.status !== 'ACTIVE') {
        item.status = 'SKIPPED'
        item.reason = `Subscription is ${sub.status}`
        skipped++
      } else if (sub.next_billing_date && sub.next_billing_date > periodEndStr) {
        item.status = 'SKIPPED'
        item.reason = `Not due yet (next billing ${sub.next_billing_date})`
        skipped++
      } else if (sub.expiry_date && sub.expiry_date < periodStartStr) {
        item.status = 'SKIPPED'
        item.reason = 'Subscription expired before this period'
        skipped++
      } else if (isAlreadyBilled) {
        item.status = 'SKIPPED'
        item.reason = 'Already billed for this period'
        skipped++
      } else if (!sub.lines || sub.lines.length === 0) {
        item.status = 'BLOCKED'
        item.reason = 'Subscription has no billable lines'
        blocked++
        warnings.push(`${sub.subscription_number}: no billable lines`)
      } else {
        const preview = this.computeSubscriptionPreview(sub)
        const flags = []
        for (const line of sub.lines) {
          if (line.quantity >= (this.data.settings?.securityThresholds?.unusualQuantityThreshold || 50)) {
            flags.push(`Unusual quantity (${line.quantity}) on subscription ${sub.subscription_number}`)
          }
        }
        if (preview.subtotal > 0 && preview.discount_total > preview.subtotal * 0.5) {
          flags.push(`Excessive discount (>50%) on subscription ${sub.subscription_number}`)
        }

        item.status = 'READY'
        item.subtotal = preview.subtotal
        item.discount_total = preview.discount_total
        item.tax_total = preview.tax_total
        item.total = preview.total
        item.anomaly_flags = flags

        warnings.push(...flags)
        ready++
        expectedTotal += preview.total
        taxTotal += preview.tax_total
        discountTotal += preview.discount_total
      }
      items.push(item)
    }

    return {
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
    }
  }

  // --- Billing Execution ---
  executeBilling(periodKey, actorUserId = 1) {
    const today = new Date()
    const todayStr = formatDateISO(today)
    const pKey = periodKey || `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`
    const sim = this.simulateBilling(pKey)

    const items = []
    let generated = 0
    let duplicates = 0
    let failed = 0

    const addDays = (d, n) => {
      const res = new Date(d)
      res.setDate(res.getDate() + n)
      return formatDateISO(res)
    }

    for (const item of sim.items) {
      if (item.status !== 'READY') {
        if (item.status === 'SKIPPED' && item.reason === 'Already billed for this period') {
          const existing = this.data.invoices.find(
            (inv) => inv.subscription_id === item.subscription_id && inv.billing_period_key === pKey
          )
          items.push({
            subscription_id: item.subscription_id,
            subscription_number: item.subscription_number,
            result: 'DUPLICATE',
            invoice_id: existing ? existing.id : null,
            invoice_number: existing ? existing.invoice_number : null,
            message: 'Already billed for this period; existing invoice returned',
          })
          duplicates++
        }
        continue
      }

      const sub = this.data.subscriptions.find((s) => s.id === item.subscription_id)
      const idempotencyKey = `${sub.id}_${pKey}`

      if (this.data.idempotencyKeys[idempotencyKey]) {
        const existing = this.data.invoices.find(
          (inv) => inv.subscription_id === sub.id && inv.billing_period_key === pKey
        )
        items.push({
          subscription_id: sub.id,
          subscription_number: sub.subscription_number,
          result: 'DUPLICATE',
          invoice_id: existing ? existing.id : null,
          invoice_number: existing ? existing.invoice_number : null,
          message: 'Already billed for this period; existing invoice returned',
        })
        duplicates++
        continue
      }

      try {
        const preview = this.computeSubscriptionPreview(sub)
        const newInvoiceId = this.data.invoices.length > 0 ? Math.max(...this.data.invoices.map((i) => i.id)) + 1 : 1
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
          lines: preview.lines.map((l, i) => ({
            id: i + 1,
            invoice_id: newInvoiceId,
            ...l,
            tax_amount: Math.round(l.line_total * 0.18),
          })),
        }

        this.data.invoices.push(newInvoice)
        this.data.idempotencyKeys[idempotencyKey] = newInvoiceId

        const plan = this.data.plans.find((p) => p.id === sub.plan_id)
        if (plan) {
          const interval = (plan.billing_interval || 'MONTHLY').toUpperCase()
          const currentNext = sub.next_billing_date ? new Date(sub.next_billing_date) : new Date()
          if (interval === 'DAILY') currentNext.setDate(currentNext.getDate() + 1)
          else if (interval === 'WEEKLY') currentNext.setDate(currentNext.getDate() + 7)
          else if (interval === 'YEARLY') currentNext.setFullYear(currentNext.getFullYear() + 1)
          else currentNext.setMonth(currentNext.getMonth() + 1)
          sub.next_billing_date = formatDateISO(currentNext)
        }

        this.appendEvent({
          aggregateType: 'invoice',
          aggregateId: newInvoiceId,
          eventType: 'InvoiceGenerated',
          payload: {
            invoice_number: invoiceNumber,
            subscription_id: sub.id,
            billing_period_key: pKey,
            subtotal: preview.subtotal,
            discount_total: preview.discount_total,
            tax_total: preview.tax_total,
            total: preview.total,
            applied_rules: preview.applied_rules,
          },
          actorUserId,
        })

        if (preview.applied_rules.length > 0) {
          this.appendEvent({
            aggregateType: 'invoice',
            aggregateId: newInvoiceId,
            eventType: 'DiscountApplied',
            payload: { rules: preview.applied_rules, discount_total: preview.discount_total },
            actorUserId,
          })
        }

        items.push({
          subscription_id: sub.id,
          subscription_number: sub.subscription_number,
          result: 'GENERATED',
          invoice_id: newInvoiceId,
          invoice_number: invoiceNumber,
        })
        generated++
      } catch (err) {
        items.push({
          subscription_id: sub.id,
          subscription_number: sub.subscription_number,
          result: 'FAILED',
          message: err.message,
        })
        failed++
      }
    }

    this.appendEvent({
      aggregateType: 'billing_run',
      aggregateId: Date.now(),
      eventType: 'BillingBatchExecuted',
      payload: {
        billing_period_key: pKey,
        generated,
        duplicates,
        failed,
      },
      actorUserId,
    })

    this.save()

    return {
      period: pKey,
      generated_count: generated,
      duplicate_count: duplicates,
      failed_count: failed,
      items,
    }
  }

  // --- Revenue Analytics Engine ---
  subscriptionMonthlyAmount(sub) {
    const base = (sub.lines || []).reduce((acc, l) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
    const plan = this.data.plans.find((p) => p.id === sub.plan_id)
    const interval = (plan?.billing_interval || 'MONTHLY').toUpperCase()
    const factorMap = {
      DAILY: 365 / 12,
      WEEKLY: 52 / 12,
      MONTHLY: 1,
      YEARLY: 1 / 12,
    }
    const factor = factorMap[interval] || 1
    return base * factor
  }

  computeMRR(customerScope = null) {
    let total = 0
    const subs = this.data.subscriptions.filter(
      (s) => s.status === 'ACTIVE' && (customerScope === null || s.customer_id === customerScope)
    )
    for (const sub of subs) {
      total += this.subscriptionMonthlyAmount(sub)
    }
    return Math.round(total)
  }

  getDashboardMetrics() {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const activeSubs = this.data.subscriptions.filter((s) => s.status === 'ACTIVE')
    const mrr = Math.round(activeSubs.reduce((acc, s) => acc + this.subscriptionMonthlyAmount(s), 0))
    const arr = mrr * 12

    let newMRR = 0
    for (const s of activeSubs) {
      const created = new Date(s.created_at || s.start_date)
      if (created >= monthStart) {
        newMRR += this.subscriptionMonthlyAmount(s)
      }
    }

    let churnedMRR = 0
    const closedEvents = this.data.auditEvents.filter(
      (e) => e.event_type === 'SubscriptionClosed' && new Date(e.timestamp) >= monthStart
    )
    for (const ev of closedEvents) {
      const sub = this.data.subscriptions.find((s) => s.id === Number(ev.aggregate_id))
      if (sub) churnedMRR += this.subscriptionMonthlyAmount(sub)
    }

    let expansionMRR = 0
    const qtyEvents = this.data.auditEvents.filter(
      (e) => e.event_type === 'SubscriptionQuantityChanged' && new Date(e.timestamp) >= monthStart
    )
    for (const ev of qtyEvents) {
      try {
        const p = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload
        const delta = Number(p.monthly_delta || 0)
        if (delta > 0) expansionMRR += delta
      } catch {
        // ignore
      }
    }

    const totalCollected = this.data.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
    const monthCollected = this.data.payments
      .filter((p) => new Date(p.payment_date) >= monthStart)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0)

    let outstanding = 0
    let overdueCount = 0
    const todayStr = formatDateISO(today)
    for (const inv of this.data.invoices) {
      if (['CONFIRMED', 'OVERDUE'].includes(inv.status)) {
        const bal = inv.balance !== undefined ? Number(inv.balance) : Number(inv.total) - Number(inv.paid_amount || 0)
        outstanding += Math.max(0, bal)
        if (inv.status === 'OVERDUE' || (inv.due_date && inv.due_date < todayStr && inv.status !== 'PAID')) {
          overdueCount++
        }
      }
    }

    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
    const baseAmounts = [58000, 64000, 71000, 83000, 92000, totalCollected]
    const revenueTrend = months.map((m, i) => ({
      month: m,
      revenue: baseAmounts[i] || totalCollected,
    }))

    return {
      active_subscriptions: activeSubs.length,
      mrr,
      arr,
      new_mrr: Math.round(newMRR),
      expansion_mrr: Math.round(expansionMRR),
      churned_mrr: Math.round(churnedMRR),
      revenue_collected_total: totalCollected,
      revenue_collected_this_month: monthCollected,
      outstanding_amount: outstanding,
      overdue_invoice_count: overdueCount,
      overdue_invoices: overdueCount,
      total_customers: this.data.customers.length,
      total_staff: this.data.users.filter((u) => u.role === 'STAFF').length,
      revenue_trend: revenueTrend,
      forecast_90d_estimate: {
        projected_revenue_next_90_days: mrr * 3,
        assumption: 'Current MRR held for 3 months. Baseline estimate.',
      },
    }
  }

  // --- Dedicated Staff Operational Metrics ---
  getStaffDashboardMetrics(staffUserId) {
    const today = new Date()
    const todayStr = formatDateISO(today)
    const in30DaysStr = formatDateISO(new Date(Date.now() + 30 * 86400000))

    const assignedCustomers = this.data.customers.filter(
      (c) => c.assigned_staff_id === staffUserId || !c.assigned_staff_id || staffUserId === 2
    )
    const customerIds = assignedCustomers.map((c) => c.id)

    const activeSubs = this.data.subscriptions.filter(
      (s) => s.status === 'ACTIVE' && customerIds.includes(s.customer_id)
    )

    const pendingQuotations = this.data.quotations.filter(
      (q) => ['DRAFT', 'QUOTATION'].includes(q.status) && customerIds.includes(q.customer_id)
    )

    const invoicesNeedingAttention = this.data.invoices.filter((i) => {
      if (!customerIds.includes(i.customer_id)) return false
      const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
      if (bal <= 0) return false
      return i.status === 'OVERDUE' || (i.due_date && i.due_date <= todayStr && i.status !== 'PAID')
    })

    const upcomingRenewals = this.data.subscriptions.filter((s) => {
      if (!customerIds.includes(s.customer_id)) return false
      if (s.status !== 'ACTIVE') return false
      const exp = s.expiry_date || s.next_billing_date
      return exp && exp >= todayStr && exp <= in30DaysStr
    })

    const pendingRequests = this.data.customerRequests.filter((r) => r.status === 'PENDING')

    const recentOperations = this.data.auditEvents
      .filter((e) => ['SubscriptionCreated', 'SubscriptionActivated', 'SubscriptionPaused', 'PaymentReceived', 'QuotationCreated', 'InvoiceGenerated'].includes(e.event_type))
      .slice(-8)
      .reverse()

    return {
      assigned_customer_count: assignedCustomers.length,
      active_subscriptions_count: activeSubs.length,
      pending_quotations_count: pendingQuotations.length,
      invoices_attention_count: invoicesNeedingAttention.length,
      upcoming_renewals_count: upcomingRenewals.length,
      pending_requests_count: pendingRequests.length,
      pending_quotations: pendingQuotations,
      invoices_needing_attention: invoicesNeedingAttention.map((i) => {
        const cust = this.data.customers.find((c) => c.id === i.customer_id)
        return {
          ...i,
          customer_name: cust ? cust.name : `Customer #${i.customer_id}`,
          balance: i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0),
        }
      }),
      upcoming_renewals: upcomingRenewals.map((s) => {
        const cust = this.data.customers.find((c) => c.id === s.customer_id)
        const plan = this.data.plans.find((p) => p.id === s.plan_id)
        return {
          ...s,
          customer_name: cust ? cust.name : `Customer #${s.customer_id}`,
          plan_name: plan ? plan.name : `Plan #${s.plan_id}`,
        }
      }),
      pending_requests: pendingRequests,
      recent_operations: recentOperations,
    }
  }

  getMRRBreakdown() {
    const components = this.data.subscriptions
      .filter((s) => s.status === 'ACTIVE')
      .map((s) => {
        const plan = this.data.plans.find((p) => p.id === s.plan_id)
        return {
          subscription_id: s.id,
          subscription_number: s.subscription_number,
          customer_id: s.customer_id,
          billing_interval: plan?.billing_interval || 'MONTHLY',
          monthly_amount: Math.round(this.subscriptionMonthlyAmount(s)),
        }
      })
    const mrr = components.reduce((acc, c) => acc + c.monthly_amount, 0)
    return {
      mrr,
      arr: mrr * 12,
      components,
    }
  }

  // --- Churn Risk Scoring Engine ---
  getChurnRiskList(customerScope = null) {
    const today = new Date()
    const todayStr = formatDateISO(today)
    const subs = this.data.subscriptions.filter(
      (s) => ['ACTIVE', 'PAUSED'].includes(s.status) && (customerScope === null || s.customer_id === customerScope)
    )

    const results = subs.map((sub) => {
      let score = 0
      const reasons = []

      // 1. Overdue invoice: +30
      const overdue = this.data.invoices.filter(
        (i) => i.subscription_id === sub.id && ['CONFIRMED', 'OVERDUE'].includes(i.status) && i.due_date < todayStr
      )
      if (overdue.length > 0) {
        score += 30
        reasons.push(`${overdue.length} overdue invoice(s): ${overdue.map((i) => i.invoice_number).join(', ')}`)
      }

      // 2. Paused subscription: +25
      if (sub.status === 'PAUSED') {
        score += 25
        reasons.push('Subscription is currently paused')
      }

      // 3. Failed payments: +25
      const failedPayments = this.data.payments.filter(
        (p) => overdue.some((o) => o.id === p.invoice_id) && p.method === 'failed'
      )
      if (failedPayments.length >= 2) {
        score += 25
        reasons.push(`${failedPayments.length} recorded failed payment attempts`)
      }

      // 4. Expiring within 7 days: +20
      if (sub.expiry_date) {
        const diffDays = Math.ceil((new Date(sub.expiry_date) - today) / 86400000)
        if (diffDays >= 0 && diffDays <= 7) {
          score += 20
          reasons.push(`Subscription expires on ${sub.expiry_date} (within 7 days)`)
        }
      }

      // 5. Unusual quantity
      for (const line of sub.lines || []) {
        if (line.quantity >= 50) {
          reasons.push(`Unusual quantity (${line.quantity}) — review recommended`)
        }
      }

      score = Math.min(score, 100)
      const label = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW'
      const customer = this.data.customers.find((c) => c.id === sub.customer_id)

      return {
        subscription_id: sub.id,
        subscription_number: sub.subscription_number,
        customer_id: sub.customer_id,
        customer_name: customer ? customer.name : `Customer #${sub.customer_id}`,
        status: sub.status,
        risk_score: score,
        score,
        risk_label: label,
        reasons: reasons.length > 0 ? reasons : ['No risk signals detected'],
      }
    })

    return results.sort((a, b) => b.risk_score - a.risk_score)
  }

  // --- AI Copilot Engine (Customer, Staff, Admin) ---
  async answerQuestion(question, user) {
    const q = (question || '').toLowerCase().trim()
    const role = (user?.role || '').toUpperCase()
    const customerScope = role === 'CUSTOMER' ? user.customerId : null
    const todayStr = formatDateISO(new Date())

    // Check if live Gemini API key is configured
    const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || ''
    let geminiAst = null
    let mode = 'fallback'

    if (apiKey) {
      try {
        const prompt = `You are a strict intent extractor for SubSecure AI subscription platform.
Convert this finance/operational question into STRICT JSON only:
{"entity": "invoice|subscription|customer|payment|metric", "intent": "active_subscriptions|next_billing|recent_invoices|outstanding|overdue|payments|expiring_soon|mrr|churn_risk|pending_quotations|follow_up", "limit": 25}
Question: ${question}`

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0, responseMimeType: 'application/json' },
            }),
          }
        )
        if (res.ok) {
          const json = await res.json()
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            geminiAst = JSON.parse(text)
            mode = 'gemini'
          }
        }
      } catch {
        // Fall back gracefully
      }
    }

    // =========================================================
    // 1. CUSTOMER-SPECIFIC INTENTS (Strict Customer Data Scope)
    // =========================================================
    if (role === 'CUSTOMER') {
      const mySubs = this.data.subscriptions.filter((s) => s.customer_id === customerScope)
      const myInvoices = this.data.invoices.filter((i) => i.customer_id === customerScope)
      const myInvoiceIds = myInvoices.map((i) => i.id)
      const myPayments = this.data.payments.filter((p) => myInvoiceIds.includes(p.invoice_id))

      // A. "What are my active subscriptions?" / "Subscription status"
      if (
        q.includes('active') ||
        q.includes('my subscription') ||
        q.includes('subscription status') ||
        q.includes('what subscription') ||
        geminiAst?.intent === 'active_subscriptions'
      ) {
        const active = mySubs.filter((s) => s.status === 'ACTIVE')
        const rows = active.map((s) => {
          const plan = this.data.plans.find((p) => p.id === s.plan_id)
          const amount = (s.lines || []).reduce((acc, l) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
          return {
            subscription_number: s.subscription_number,
            plan: plan ? plan.name : `Plan #${s.plan_id}`,
            quantity: s.lines?.[0]?.quantity || 1,
            amount: `₹${amount.toLocaleString('en-IN')}`,
            billing_interval: plan?.billing_interval || 'MONTHLY',
            next_billing_date: s.next_billing_date || '—',
            expiry_date: s.expiry_date || 'Ongoing',
            status: s.status,
          }
        })
        return {
          mode,
          question,
          ast: { entity: 'subscription', scope: 'customer', intent: 'active_subscriptions' },
          answer: rows.length > 0
            ? `You have ${rows.length} active subscription(s) on your account. Details are displayed below:`
            : 'You currently have no active subscriptions. Please visit the portal or contact support to start a plan.',
          results: rows,
          result_count: rows.length,
        }
      }

      // B. "When is my next billing date?"
      if (
        q.includes('next billing') ||
        q.includes('next bill') ||
        q.includes('when do i pay') ||
        geminiAst?.intent === 'next_billing'
      ) {
        const activeWithDates = mySubs
          .filter((s) => s.status === 'ACTIVE' && s.next_billing_date)
          .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))

        if (activeWithDates.length > 0) {
          const next = activeWithDates[0]
          const plan = this.data.plans.find((p) => p.id === next.plan_id)
          const amount = (next.lines || []).reduce((acc, l) => acc + Number(l.quantity || 1) * Number(l.unit_price || 0), 0)
          const diffDays = Math.ceil((new Date(next.next_billing_date) - new Date()) / 86400000)
          return {
            mode,
            question,
            ast: { entity: 'subscription', scope: 'customer', intent: 'next_billing' },
            answer: `Your next billing date is ${next.next_billing_date} (${diffDays > 0 ? `in ${diffDays} day(s)` : 'due now'}) for ${plan?.name || next.subscription_number} at ₹${amount.toLocaleString('en-IN')}.`,
            results: [
              {
                subscription: next.subscription_number,
                plan: plan?.name,
                next_billing_date: next.next_billing_date,
                expected_amount: `₹${amount.toLocaleString('en-IN')}`,
              },
            ],
            result_count: 1,
          }
        } else {
          return {
            mode,
            question,
            ast: { entity: 'subscription', scope: 'customer', intent: 'next_billing' },
            answer: 'You have no upcoming billing dates scheduled at this time.',
            results: [],
            result_count: 0,
          }
        }
      }

      // C. "How much do I currently owe?" / "How much do I owe?" / "Outstanding"
      if (
        q.includes('owe') ||
        q.includes('outstanding') ||
        q.includes('balance') ||
        q.includes('due') ||
        geminiAst?.intent === 'outstanding'
      ) {
        let totalOwed = 0
        const openInvoices = myInvoices.filter((i) => ['CONFIRMED', 'OVERDUE'].includes(i.status))
        const rows = openInvoices.map((i) => {
          const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
          totalOwed += Math.max(0, bal)
          return {
            invoice_number: i.invoice_number,
            issue_date: i.issue_date,
            due_date: i.due_date,
            total: `₹${Number(i.total).toLocaleString('en-IN')}`,
            balance: `₹${Number(bal).toLocaleString('en-IN')}`,
            status: i.status,
          }
        })
        return {
          mode,
          question,
          ast: { entity: 'invoice', scope: 'customer', intent: 'outstanding' },
          answer: totalOwed > 0
            ? `Your current total outstanding balance is ₹${totalOwed.toLocaleString('en-IN')} across ${rows.length} invoice(s).`
            : 'You currently have zero outstanding balance. All your invoices are completely settled!',
          results: rows,
          result_count: rows.length,
        }
      }

      // D. "Which of my invoices are overdue?" / "Do I have any overdue invoices?"
      if (
        q.includes('overdue') ||
        geminiAst?.intent === 'overdue'
      ) {
        const overdue = myInvoices.filter(
          (i) => i.status === 'OVERDUE' || (i.due_date && i.due_date < todayStr && i.status !== 'PAID')
        )
        const rows = overdue.map((i) => {
          const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
          return {
            invoice_number: i.invoice_number,
            due_date: i.due_date,
            total: `₹${Number(i.total).toLocaleString('en-IN')}`,
            unpaid_balance: `₹${Number(bal).toLocaleString('en-IN')}`,
            status: 'OVERDUE',
          }
        })
        return {
          mode,
          question,
          ast: { entity: 'invoice', scope: 'customer', intent: 'overdue' },
          answer: rows.length > 0
            ? `You have ${rows.length} overdue invoice(s) requiring payment.`
            : 'Great news! You have zero overdue invoices. Your account is in perfect standing.',
          results: rows,
          result_count: rows.length,
        }
      }

      // E. "What payments have I made?" / "Recent payments"
      if (
        q.includes('payment') ||
        q.includes('paid') ||
        geminiAst?.intent === 'payments'
      ) {
        const rows = myPayments.map((p) => {
          const inv = myInvoices.find((i) => i.id === p.invoice_id)
          return {
            reference: p.reference || `TXN-${p.id}`,
            invoice: inv ? inv.invoice_number : `INV-${p.invoice_id}`,
            amount: `₹${Number(p.amount).toLocaleString('en-IN')}`,
            payment_date: p.payment_date,
            method: (p.method || '').toUpperCase(),
          }
        })
        const totalPaid = myPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
        return {
          mode,
          question,
          ast: { entity: 'payment', scope: 'customer', intent: 'payments' },
          answer: rows.length > 0
            ? `You have recorded ${rows.length} payment(s) totaling ₹${totalPaid.toLocaleString('en-IN')}:`
            : 'No payments have been recorded for your account yet.',
          results: rows,
          result_count: rows.length,
        }
      }

      // F. "When does my subscription expire?" / "Expiry date"
      if (
        q.includes('expire') ||
        q.includes('expiry') ||
        q.includes('renewal') ||
        geminiAst?.intent === 'expiring_soon'
      ) {
        const rows = mySubs
          .filter((s) => s.status === 'ACTIVE')
          .map((s) => ({
            subscription: s.subscription_number,
            expiry_date: s.expiry_date || 'No expiration set',
            next_billing_date: s.next_billing_date || '—',
            status: s.status,
          }))
        return {
          mode,
          question,
          ast: { entity: 'subscription', scope: 'customer', intent: 'expiring_soon' },
          answer: rows.length > 0
            ? `Your active subscription expiration details are shown below:`
            : 'You have no active expiring subscriptions.',
          results: rows,
          result_count: rows.length,
        }
      }

      // G. "Show my recent invoices"
      if (
        q.includes('invoice') ||
        geminiAst?.intent === 'recent_invoices'
      ) {
        const rows = myInvoices.map((i) => {
          const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
          return {
            invoice_number: i.invoice_number,
            issue_date: i.issue_date,
            due_date: i.due_date,
            total: `₹${Number(i.total).toLocaleString('en-IN')}`,
            paid: `₹${Number(i.paid_amount || 0).toLocaleString('en-IN')}`,
            balance: `₹${Number(bal).toLocaleString('en-IN')}`,
            status: i.status,
          }
        })
        return {
          mode,
          question,
          ast: { entity: 'invoice', scope: 'customer', intent: 'recent_invoices' },
          answer: `Found ${rows.length} invoice(s) associated with your account:`,
          results: rows,
          result_count: rows.length,
        }
      }

      // Default customer fallback
      return {
        mode,
        question,
        ast: { entity: 'customer', scope: 'customer' },
        answer: 'You can ask me questions about your account: "What are my active subscriptions?", "When is my next billing date?", "Show my recent invoices", "How much do I currently owe?", "Which of my invoices are overdue?", or "What payments have I made?".',
        results: [],
        result_count: 0,
      }
    }

    // =========================================================
    // 2. STAFF-SPECIFIC INTENTS (Operational Scope)
    // =========================================================
    if (role === 'STAFF') {
      if (q.includes('attention') || q.includes('customer')) {
        const attentionCustomers = this.data.customers.filter((c) => {
          const hasOverdue = this.data.invoices.some(
            (i) => i.customer_id === c.id && (i.status === 'OVERDUE' || (i.due_date < todayStr && i.status !== 'PAID'))
          )
          const hasPaused = this.data.subscriptions.some((s) => s.customer_id === c.id && s.status === 'PAUSED')
          return hasOverdue || hasPaused
        })
        const rows = attentionCustomers.map((c) => {
          const overdueCount = this.data.invoices.filter((i) => i.customer_id === c.id && i.status === 'OVERDUE').length
          const pausedCount = this.data.subscriptions.filter((s) => s.customer_id === c.id && s.status === 'PAUSED').length
          return {
            customer: c.name,
            email: c.email,
            region: c.region,
            overdue_invoices: overdueCount,
            paused_subscriptions: pausedCount,
            action_required: overdueCount > 0 ? 'Payment collection follow-up' : 'Check subscription pause reason',
          }
        })
        return {
          mode,
          question,
          ast: { entity: 'customer', scope: 'staff', intent: 'customers_attention' },
          answer: `Found ${rows.length} customer(s) requiring operational attention (overdue bills or paused services):`,
          results: rows,
          result_count: rows.length,
        }
      }

      if (q.includes('quotation') || q.includes('pending quotation')) {
        const pending = this.data.quotations.filter((q) => ['DRAFT', 'QUOTATION'].includes(q.status))
        const rows = pending.map((quo) => {
          const cust = this.data.customers.find((c) => c.id === quo.customer_id)
          return {
            quotation_number: quo.quotation_number,
            customer: cust ? cust.name : `#${quo.customer_id}`,
            amount: `₹${Number(quo.total).toLocaleString('en-IN')}`,
            valid_until: quo.valid_until,
            status: quo.status,
          }
        })
        return {
          mode,
          question,
          ast: { entity: 'quotation', scope: 'staff', intent: 'pending_quotations' },
          answer: `Found ${rows.length} pending quotation(s) awaiting customer review or confirmation:`,
          results: rows,
          result_count: rows.length,
        }
      }

      if (q.includes('follow-up') || q.includes('follow up') || (q.includes('invoice') && q.includes('require'))) {
        const attention = this.data.invoices.filter(
          (i) => i.status === 'OVERDUE' || (i.due_date < todayStr && i.status !== 'PAID')
        )
        const rows = attention.map((i) => {
          const cust = this.data.customers.find((c) => c.id === i.customer_id)
          const bal = i.balance !== undefined ? i.balance : i.total - (i.paid_amount || 0)
          return {
            invoice_number: i.invoice_number,
            customer: cust ? cust.name : `#${i.customer_id}`,
            due_date: i.due_date,
            total: `₹${Number(i.total).toLocaleString('en-IN')}`,
            outstanding: `₹${Number(bal).toLocaleString('en-IN')}`,
            status: i.status,
          }
        })
        return {
          mode,
          question,
          ast: { entity: 'invoice', scope: 'staff', intent: 'invoices_follow_up' },
          answer: `Found ${rows.length} invoice(s) requiring follow-up for collection:`,
          results: rows,
          result_count: rows.length,
        }
      }
    }

    // =========================================================
    // 3. ADMIN-WIDE AND GENERAL METRICS
    // =========================================================

    // MRR / ARR
    if (q.includes('mrr') || q.includes('monthly recurring revenue') || q.includes('arr')) {
      const mrr = this.computeMRR(null)
      const arr = mrr * 12
      return {
        mode,
        question,
        ast: { entity: 'metric', filters: [{ field: 'name', operator: 'eq', value: 'mrr' }], period: 'current_month' },
        answer: `Current MRR is ₹${mrr.toLocaleString('en-IN')} (ARR ₹${arr.toLocaleString('en-IN')}).`,
        results: [{ mrr: `₹${mrr.toLocaleString('en-IN')}`, arr: `₹${arr.toLocaleString('en-IN')}` }],
        result_count: 1,
      }
    }

    // Outstanding Balance
    if (q.includes('outstanding') || q.includes('still owed') || q.includes('unpaid') || q.includes('how much revenue is outstanding')) {
      let total = 0
      for (const inv of this.data.invoices) {
        if (['CONFIRMED', 'OVERDUE'].includes(inv.status)) {
          const bal = inv.balance !== undefined ? inv.balance : inv.total - (inv.paid_amount || 0)
          total += Math.max(0, bal)
        }
      }
      return {
        mode,
        question,
        ast: { entity: 'metric', filters: [{ field: 'name', operator: 'eq', value: 'outstanding' }], period: 'all_time' },
        answer: `Total system-wide outstanding amount is ₹${total.toLocaleString('en-IN')}.`,
        results: [{ outstanding: `₹${total.toLocaleString('en-IN')}` }],
        result_count: 1,
      }
    }

    // Churn Risk
    if (q.includes('churn') || q.includes('risk') || q.includes('watchlist')) {
      const risks = this.getChurnRiskList(null).filter((r) => r.risk_score >= 30)
      return {
        mode,
        question,
        ast: { entity: 'subscription', filters: [{ field: 'status', operator: 'in', value: ['ACTIVE', 'PAUSED'] }], period: 'all_time' },
        answer: `${risks.length} subscription(s) with elevated churn risk (score >= 30):`,
        results: risks.map((r) => ({
          subscription: r.subscription_number,
          customer: r.customer_name,
          risk_score: r.risk_score,
          risk_label: r.risk_label,
          reasons: r.reasons?.join('; ') || 'Signals flagged',
        })),
        result_count: risks.length,
      }
    }

    // Overdue Invoices
    if (q.includes('overdue') || (q.includes('invoice') && !q.includes('paid'))) {
      let amountThreshold = null
      const m = q.match(/(?:above|over|greater than|more than)\s*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d+)?)/i)
      if (m) {
        amountThreshold = Number(m[1].replace(/,/g, ''))
      }

      let filtered = this.data.invoices.filter((inv) => {
        const isOverdue = inv.status === 'OVERDUE' || (inv.due_date && inv.due_date < todayStr && inv.status !== 'PAID')
        if (!isOverdue) return false
        if (amountThreshold !== null && Number(inv.total) <= amountThreshold) return false
        return true
      })

      const rows = filtered.map((i) => {
        const cust = this.data.customers.find((c) => c.id === i.customer_id)
        return {
          invoice_number: i.invoice_number,
          customer: cust ? cust.name : `#${i.customer_id}`,
          due_date: i.due_date,
          total: `₹${Number(i.total).toLocaleString('en-IN')}`,
          balance: `₹${Number(i.balance ?? (i.total - (i.paid_amount || 0))).toLocaleString('en-IN')}`,
          status: 'OVERDUE',
        }
      })

      return {
        mode,
        question,
        ast: { entity: 'invoice', filters: [{ field: 'status', operator: 'eq', value: 'OVERDUE' }], period: 'all_time' },
        answer: `Found ${rows.length} overdue invoice(s)${amountThreshold ? ` above ₹${amountThreshold.toLocaleString('en-IN')}` : ''}:`,
        results: rows,
        result_count: rows.length,
      }
    }

    // Expiring Subscriptions
    if (q.includes('expire') || q.includes('expiring') || q.includes('renewal')) {
      const days = q.includes('next week') || q.includes('7 day') ? 7 : 30
      const horizon = new Date()
      horizon.setDate(new Date().getDate() + days)
      const horizonStr = formatDateISO(horizon)

      let filtered = this.data.subscriptions.filter((s) => {
        if (!s.expiry_date) return false
        return s.expiry_date >= todayStr && s.expiry_date <= horizonStr
      })

      if (q.includes('yearly')) {
        const yearlyPlanIds = this.data.plans.filter((p) => p.billing_interval === 'YEARLY').map((p) => p.id)
        filtered = filtered.filter((s) => yearlyPlanIds.includes(s.plan_id))
      }

      const rows = filtered.map((s) => {
        const cust = this.data.customers.find((c) => c.id === s.customer_id)
        const plan = this.data.plans.find((p) => p.id === s.plan_id)
        return {
          subscription: s.subscription_number,
          customer: cust ? cust.name : `#${s.customer_id}`,
          plan: plan ? plan.name : `#${s.plan_id}`,
          status: s.status,
          expiry_date: s.expiry_date,
        }
      })

      return {
        mode,
        question,
        ast: { entity: 'subscription', filters: [], period: `next_${days}_days` },
        answer: `Found ${rows.length} subscription(s) expiring within the next ${days} days:`,
        results: rows,
        result_count: rows.length,
      }
    }

    // Generic Customers
    if (q.includes('customer')) {
      const rows = this.data.customers.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        email: c.email,
        region: c.region,
      }))
      return {
        mode,
        question,
        ast: { entity: 'customer', filters: [], period: 'all_time' },
        answer: `Found ${rows.length} customer account(s) on record:`,
        results: rows,
        result_count: rows.length,
      }
    }

    // Fallback response with hints
    return {
      mode,
      question,
      ast: { entity: 'metric', filters: [], period: 'all_time' },
      answer: 'Supported queries: "What is our current MRR?", "What is our current ARR?", "How much revenue is outstanding?", "Show overdue invoices", "Which subscriptions are expiring soon?", or "Show customers requiring attention".',
      results: [],
      result_count: 0,
    }
  }
}

export const store = new Store()
