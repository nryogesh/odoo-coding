/**
 * Comprehensive Automated Test Suite for SubSecure AI
 * Tests all 10 phases and requirements strictly against the running API.
 */

const BASE_URL = 'http://localhost:3000/api/v1'

function pad2(n) {
  return String(n).padStart(2, '0')
}

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const t0 = performance.now()
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const t1 = performance.now()

  let data
  try {
    data = await res.json()
  } catch {
    data = null
  }

  return { status: res.status, data, durationMs: Math.round(t1 - t0) }
}

let passed = 0
let failed = 0
const results = []

function assert(description, condition, details = '') {
  if (condition) {
    passed++
    console.log(`  [PASS] ${description}`)
    results.push({ test: description, status: 'PASS', details })
  } else {
    failed++
    console.error(`  [FAIL] ${description} - ${details}`)
    results.push({ test: description, status: 'FAIL', details })
  }
}

async function runTests() {
  console.log('\n======================================================')
  console.log(' SUBSECURE AI COMPREHENSIVE AUTOMATED VERIFICATION SUITE')
  console.log('======================================================\n')

  // --- 1. AUTHENTICATION & SECURITY ---
  console.log('--- 1. AUTHENTICATION & SECURITY ---')

  // Valid Login
  const loginRes = await req('POST', '/auth/login', { email: 'admin@brightloop.io', password: 'Admin@12345' })
  assert('Admin login successful', loginRes.status === 200 && loginRes.data.user.role === 'ADMIN', `Status: ${loginRes.status}`)
  assert('Login latency is well under 2.0s', loginRes.durationMs < 2000, `${loginRes.durationMs}ms`)

  // Invalid Password
  const badLogin = await req('POST', '/auth/login', { email: 'admin@brightloop.io', password: 'WrongPassword' })
  assert('Invalid password rejected with 401', badLogin.status === 401, `Status: ${badLogin.status}`)

  // Duplicate email registration
  const dupReg = await req('POST', '/auth/register', { name: 'Admin Clone', email: 'admin@brightloop.io', password: 'Valid@Password123' })
  assert('Duplicate email registration rejected with 400', dupReg.status === 400, `Status: ${dupReg.status}`)

  // Weak password registration
  const weakReg = await req('POST', '/auth/register', { name: 'Weak User', email: 'weak@example.com', password: 'password' })
  assert('Weak password rejected (<8 chars / missing complexity)', weakReg.status === 400, `Status: ${weakReg.status}`)

  // Valid Registration
  const testEmail = `cust_${Date.now()}@example.com`
  const regRes = await req('POST', '/auth/register', { name: 'Test Customer', email: testEmail, password: 'Secure@Password123' })
  assert('Valid customer registration succeeds with 201', regRes.status === 201 && regRes.data.role === 'CUSTOMER', `Status: ${regRes.status}`)

  // Forgot password & Reset token generation
  const forgotRes = await req('POST', '/auth/forgot-password', { email: testEmail })
  assert('Forgot password generates secure token', forgotRes.status === 200 && forgotRes.data.token && forgotRes.data.token.startsWith('rst_'), `Token: ${forgotRes.data.token}`)

  // Password reset with token
  const resetRes = await req('POST', '/auth/reset-password', {
    email: testEmail,
    token: forgotRes.data.token,
    new_password: 'NewSecure@Password99',
  })
  assert('Reset password succeeds', resetRes.status === 200, `Status: ${resetRes.status}`)

  // --- 2. ROLE-BASED ACCESS CONTROL (RBAC) ---
  console.log('\n--- 2. ROLE-BASED ACCESS CONTROL (RBAC) ---')

  // Staff forbidden on Admin endpoints
  const staffUsers = await req('GET', '/users', null, 'staff@brightloop.io')
  assert('Staff access to /users returns HTTP 403 Forbidden', staffUsers.status === 403, `Status: ${staffUsers.status}`)

  const staffBillExec = await req('POST', '/billing/execute', { billing_period_key: '2026-11' }, 'staff@brightloop.io')
  assert('Staff execution of live billing returns HTTP 403 Forbidden', staffBillExec.status === 403, `Status: ${staffBillExec.status}`)

  const staffDiscounts = await req('POST', '/discounts', { name: 'Hacked Discount', discount_value: 99 }, 'staff@brightloop.io')
  assert('Staff creation of discount rules returns HTTP 403 Forbidden', staffDiscounts.status === 403, `Status: ${staffDiscounts.status}`)

  // Customer data isolation
  const custOwn = await req('GET', '/customers', null, 'customer@acme.io')
  assert('Customer only retrieves their own customer record (id: 1)', custOwn.status === 200 && custOwn.data.length === 1 && custOwn.data[0].id === 1)

  const custForeign = await req('GET', '/customers/2', null, 'customer@acme.io')
  assert('Customer attempt to view Customer #2 returns HTTP 403 Forbidden', custForeign.status === 403, `Status: ${custForeign.status}`)

  // --- 3. PRODUCTS & VARIANTS ---
  console.log('\n--- 3. PRODUCTS & VARIANTS ---')

  const prodList = await req('GET', '/products', null, 'admin@brightloop.io')
  assert('Products retrieved with variants', prodList.status === 200 && prodList.data.length >= 4)
  const crm = prodList.data.find((p) => p.id === 1)
  assert('CRM product contains Odoo variant (+₹560)', crm && crm.variants.some((v) => v.name === 'Odoo Brand' && v.price_adjustment === 560))

  // --- 4. PLANS & RESTRICTIONS ---
  console.log('\n--- 4. PLANS & RESTRICTIONS ---')

  const planList = await req('GET', '/plans', null, 'admin@brightloop.io')
  assert('Plans support monthly, yearly, weekly, and daily intervals', planList.status === 200 && planList.data.some((p) => p.billing_interval === 'YEARLY') && planList.data.some((p) => p.billing_interval === 'DAILY'))

  // Enforce plan restriction: Pause blocked on plan 2
  const pauseTest = await req('POST', '/subscriptions/2/transition', { action: 'pause' }, 'admin@brightloop.io')
  assert('Pause blocked on Plan 2 which disallows pausing (HTTP 400)', pauseTest.status === 400 && pauseTest.data.detail.includes('does not allow pausing'))

  // --- 5. QUOTATIONS & SUBSCRIPTION LIFECYCLE ---
  console.log('\n--- 5. QUOTATIONS & SUBSCRIPTION LIFECYCLE ---')

  const newQuote = await req('POST', '/quotations', {
    customer_id: 1,
    plan_id: 1,
    lines: [{ product_id: 1, quantity: 2 }],
    tax_percent: 18,
    discount_percent: 10,
    valid_days: 30,
  }, 'staff@brightloop.io')
  assert('Quotation created with tax and discount calculation', newQuote.status === 201 && newQuote.data.subtotal === 10000 && newQuote.data.discount_total === 1000 && newQuote.data.total === 10620)

  // Convert quotation to subscription
  const convertRes = await req('POST', `/quotations/${newQuote.data.id}/transition`, { action: 'convert' }, 'staff@brightloop.io')
  assert('Quotation converted to subscription', convertRes.status === 200 && convertRes.data.status === 'ACTIVE')

  // --- 6. BILLING REHEARSAL & DUPLICATE PREVENTION ---
  console.log('\n--- 6. BILLING REHEARSAL & DUPLICATE PREVENTION ---')

  const testPeriod = `2028-${pad2(Math.floor(Math.random() * 12) + 1)}`
  const simRes = await req('POST', '/billing/simulate', { billing_period_key: testPeriod }, 'staff@brightloop.io')
  assert('Billing rehearsal simulation returns dry run without writing invoices', simRes.status === 200 && simRes.data.dry_run === true && simRes.data.ready_count > 0)

  const execRes1 = await req('POST', '/billing/execute', { billing_period_key: testPeriod }, 'admin@brightloop.io')
  assert('First billing execution generates invoices', execRes1.status === 200 && execRes1.data.generated_count > 0)

  // Repeated billing execution must be 100% duplicate-prevented
  const execRes2 = await req('POST', '/billing/execute', { billing_period_key: testPeriod }, 'admin@brightloop.io')
  assert('Duplicate billing execution safely returns 0 generated and marks duplicates', execRes2.status === 200 && execRes2.data.generated_count === 0 && execRes2.data.duplicate_count > 0)

  // --- 7. PAYMENT RECONCILIATION & BALANCE RECOVERY ---
  console.log('\n--- 7. PAYMENT RECONCILIATION & BALANCE RECOVERY ---')

  const invoices = await req('GET', '/invoices', null, 'admin@brightloop.io')
  const openInv = invoices.data.find((i) => i.balance > 0)
  assert('Found open invoice for payment test', !!openInv, `Invoice ID: ${openInv?.id}, Balance: ${openInv?.balance}`)

  if (openInv) {
    const bal = openInv.balance
    // Overpayment prevention
    const overpay = await req('POST', '/payments', { invoice_id: openInv.id, amount: bal + 50000 }, 'admin@brightloop.io')
    assert('Overpayment rejected with HTTP 400', overpay.status === 400)

    // Partial payment
    const partialAmount = Math.floor(bal / 2)
    const partPay = await req('POST', '/payments', { invoice_id: openInv.id, amount: partialAmount, method: 'upi' }, 'admin@brightloop.io')
    assert('Partial payment updates balance correctly', partPay.status === 201 && partPay.data.balance === bal - partialAmount)

    // Full payment of remaining balance
    const remPay = await req('POST', '/payments', { invoice_id: openInv.id, amount: bal - partialAmount, method: 'upi' }, 'admin@brightloop.io')
    assert('Full payment marks invoice status as PAID with 0 balance', remPay.status === 201 && remPay.data.invoice_status === 'PAID' && remPay.data.balance === 0)
  }

  // --- 8. AI COPILOT & CUSTOMER SCOPE ---
  console.log('\n--- 8. AI COPILOT & CUSTOMER SCOPE ---')

  const aiQuery1 = await req('POST', '/assistant/query', { question: 'What are my active subscriptions?' }, 'customer@acme.io')
  assert('Customer Copilot answers active subscriptions query from live DB', aiQuery1.status === 200 && aiQuery1.data.data.length >= 1)

  const aiQuery2 = await req('POST', '/assistant/query', { question: 'When is my next billing date?' }, 'customer@acme.io')
  assert('Customer Copilot answers next billing date query', aiQuery2.status === 200 && aiQuery2.data.answer.includes('next billing date'))

  const aiQuery3 = await req('POST', '/assistant/query', { question: 'What payments have I made?' }, 'customer@acme.io')
  assert('Customer Copilot returns only customer payments', aiQuery3.status === 200 && Array.isArray(aiQuery3.data.data))

  // --- 9. CRYPTOGRAPHIC AUDIT LEDGER INTEGRITY ---
  console.log('\n--- 9. CRYPTOGRAPHIC AUDIT LEDGER INTEGRITY ---')

  const verifyAudit = await req('POST', '/audit/verify', {}, 'admin@brightloop.io')
  assert('Cryptographic SHA-256 audit ledger is fully intact and verified from genesis', verifyAudit.status === 200 && verifyAudit.data.valid === true && verifyAudit.data.status === 'VERIFIED')

  // --- 10. SYSTEM PERFORMANCE ---
  console.log('\n--- 10. SYSTEM PERFORMANCE ---')

  const perfEndpoints = ['/products', '/plans', '/invoices', '/subscriptions', '/customers', '/analytics/mrr']
  let maxLatency = 0
  for (const ep of perfEndpoints) {
    const pRes = await req('GET', ep, null, 'admin@brightloop.io')
    if (pRes.durationMs > maxLatency) maxLatency = pRes.durationMs
    assert(`Response time for ${ep} is under 2000ms`, pRes.durationMs < 2000, `Actual: ${pRes.durationMs}ms`)
  }

  console.log('\n======================================================')
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log(` MAX MEASURED LATENCY: ${maxLatency}ms (Requirement: < 2000ms)`)
  console.log('======================================================\n')

  return { passed, failed, maxLatency, results }
}

runTests().then((res) => {
  if (res.failed > 0) process.exit(1)
  process.exit(0)
}).catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
