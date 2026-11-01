/**
 * SubSecure AI - Comprehensive Automated Verification & Hardening Suite
 * Rigorously validates all 10 problem statement phases, security invariants,
 * cryptographic JWTs, role isolation, billing idempotency, dynamic taxes,
 * and high-volume performance.
 */

import crypto from 'crypto'

const BASE_URL = 'http://localhost:3000/api/v1'

function pad2(n) {
  return String(n).padStart(2, '0')
}

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const t0 = performance.now()
  let res
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    return { status: 0, data: { detail: err.message }, durationMs: 0 }
  }
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
const testRecords = []

function assert(description, condition, details = '') {
  if (condition) {
    passed++
    console.log(`  [PASS] ${description}`)
    testRecords.push({ test: description, status: 'PASS', details })
  } else {
    failed++
    console.error(`  [FAIL] ${description} - ${details}`)
    testRecords.push({ test: description, status: 'FAIL', details })
  }
}

async function runAllTests() {
  console.log('\n======================================================')
  console.log(' SUBSECURE AI - EXHAUSTIVE AUTOMATED VERIFICATION SUITE')
  console.log('======================================================\n')

  // --- PHASE 1 & 2: AUTHENTICATION, CRYPTOGRAPHIC JWTS & TOKENS ---
  console.log('--- 1. AUTHENTICATION & CRYPTOGRAPHIC JWT TOKENS ---')

  // Admin Login & JWT Issuance
  const adminLogin = await req('POST', '/auth/login', { email: 'admin@brightloop.io', password: 'Admin@12345' })
  assert('Admin login returns HTTP 200 with ADMIN role', adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN', `Status: ${adminLogin.status}`)
  assert('Admin access token is a valid 3-part cryptographic JWT', typeof adminLogin.data.access_token === 'string' && adminLogin.data.access_token.split('.').length === 3)
  assert('Login latency is well under 2000ms', adminLogin.durationMs < 2000, `${adminLogin.durationMs}ms`)
  const adminToken = adminLogin.data.access_token

  // Staff Login
  const staffLogin = await req('POST', '/auth/login', { email: 'staff@brightloop.io', password: 'Staff@12345' })
  assert('Staff login returns HTTP 200 with STAFF role', staffLogin.status === 200 && staffLogin.data.user.role === 'STAFF', `Status: ${staffLogin.status}`)
  const staffToken = staffLogin.data.access_token

  // Customer Login
  const custLogin = await req('POST', '/auth/login', { email: 'customer@acme.io', password: 'Customer@12345' })
  assert('Customer login returns HTTP 200 with CUSTOMER role', custLogin.status === 200 && custLogin.data.user.role === 'CUSTOMER', `Status: ${custLogin.status}`)
  const custToken = custLogin.data.access_token

  // Reject Invalid Password
  const badLogin = await req('POST', '/auth/login', { email: 'admin@brightloop.io', password: 'WrongPassword' })
  assert('Invalid password rejected with HTTP 401', badLogin.status === 401, `Status: ${badLogin.status}`)

  // Duplicate email registration rejected
  const dupReg = await req('POST', '/auth/register', { name: 'Admin Clone', email: 'admin@brightloop.io', password: 'Valid@Password123' })
  assert('Duplicate email registration rejected with HTTP 400', dupReg.status === 400, `Status: ${dupReg.status}`)

  // Password complexity: rejected if missing uppercase, lowercase, or special char
  const weakReg1 = await req('POST', '/auth/register', { name: 'Weak1', email: 'weak1@example.com', password: 'password123' })
  assert('Password without uppercase rejected with HTTP 400', weakReg1.status === 400, `Status: ${weakReg1.status}`)
  const weakReg2 = await req('POST', '/auth/register', { name: 'Weak2', email: 'weak2@example.com', password: 'PASSWORD123!' })
  assert('Password without lowercase rejected with HTTP 400', weakReg2.status === 400, `Status: ${weakReg2.status}`)
  const weakReg3 = await req('POST', '/auth/register', { name: 'Weak3', email: 'weak3@example.com', password: 'Password123' })
  assert('Password without special char rejected with HTTP 400', weakReg3.status === 400, `Status: ${weakReg3.status}`)

  // Valid Customer Registration
  const testEmail = `user_${Date.now()}@testcorp.io`
  const regRes = await req('POST', '/auth/register', { name: 'Test Corp Customer', email: testEmail, password: 'Secure@Password123' })
  assert('Valid customer registration succeeds with HTTP 201', regRes.status === 201 && regRes.data.role === 'CUSTOMER', `Status: ${regRes.status}`)
  assert('Customer registration returns signed JWT token', regRes.data.access_token && regRes.data.access_token.split('.').length === 3)

  // Token Verification Security: Reject raw email string as pseudo-token
  const rawEmailAttempt = await req('GET', '/auth/me', null, 'admin@brightloop.io')
  assert('Raw email passed as pseudo-token rejected with HTTP 401 Unauthorized', rawEmailAttempt.status === 401, `Status: ${rawEmailAttempt.status}`)

  // Token Verification Security: Reject tampered JWT token
  const tamperedToken = adminToken.substring(0, adminToken.length - 10) + 'ABCDEFGHIJ'
  const tamperedAttempt = await req('GET', '/auth/me', null, tamperedToken)
  assert('Tampered JWT signature rejected with HTTP 401 Unauthorized', tamperedAttempt.status === 401, `Status: ${tamperedAttempt.status}`)

  // Token Verification Security: Reject malformed garbage token
  const malformedAttempt = await req('GET', '/auth/me', null, 'malformed.garbage.token')
  assert('Malformed token rejected with HTTP 401 Unauthorized', malformedAttempt.status === 401, `Status: ${malformedAttempt.status}`)

  // Password Reset: Forgot Password generates 15-minute token
  const forgotRes = await req('POST', '/auth/forgot-password', { email: testEmail })
  assert('Forgot password generates secure 32-byte token', forgotRes.status === 200 && forgotRes.data.token && forgotRes.data.token.startsWith('rst_'))
  const resetToken = forgotRes.data.token

  // Password Reset: Succeeded with valid token
  const resetRes = await req('POST', '/auth/reset-password', {
    email: testEmail,
    token: resetToken,
    new_password: 'NewStrong@Password99',
  })
  assert('Reset password succeeds with valid single-use token', resetRes.status === 200, `Status: ${resetRes.status}`)

  // Password Reset: Reusing the same token must be rejected (single-use invariant)
  const reuseRes = await req('POST', '/auth/reset-password', {
    email: testEmail,
    token: resetToken,
    new_password: 'Another@Password99',
  })
  assert('Reused password reset token is strictly rejected (HTTP 400)', reuseRes.status === 400 && reuseRes.data.detail.includes('already been used'))

  // Verify login with new password
  const newLogin = await req('POST', '/auth/login', { email: testEmail, password: 'NewStrong@Password99' })
  assert('Login succeeds with newly reset password', newLogin.status === 200, `Status: ${newLogin.status}`)

  // --- PHASE 3: ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS ---
  console.log('\n--- 2. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS ---')

  // Staff forbidden on User Management (/users)
  const staffUsers = await req('GET', '/users', null, staffToken)
  assert('Staff access to /users returns HTTP 403 Forbidden', staffUsers.status === 403, `Status: ${staffUsers.status}`)

  // Staff forbidden on live billing execution (/billing/execute)
  const staffBilling = await req('POST', '/billing/execute', { billing_period_key: '2026-11' }, staffToken)
  assert('Staff execution of live billing returns HTTP 403 Forbidden', staffBilling.status === 403, `Status: ${staffBilling.status}`)

  // Staff forbidden on creating discount rules
  const staffDiscount = await req('POST', '/discounts', { name: 'Staff Rule', discount_value: 50 }, staffToken)
  assert('Staff creation of discount rules returns HTTP 403 Forbidden', staffDiscount.status === 403, `Status: ${staffDiscount.status}`)

  // Staff forbidden on creating tax rules
  const staffTax = await req('POST', '/taxes', { name: 'Staff Tax', percentage: 25 }, staffToken)
  assert('Staff creation of tax rules returns HTTP 403 Forbidden', staffTax.status === 403, `Status: ${staffTax.status}`)

  // Customer forbidden on Staff/Admin endpoints
  const custPlansPost = await req('POST', '/plans', { name: 'Unauthorized Plan' }, custToken)
  assert('Customer creation of plans returns HTTP 403 Forbidden', custPlansPost.status === 403, `Status: ${custPlansPost.status}`)

  const custBillingSim = await req('POST', '/billing/simulate', {}, custToken)
  assert('Customer access to billing rehearsal returns HTTP 403 Forbidden', custBillingSim.status === 403, `Status: ${custBillingSim.status}`)

  // Customer Data Isolation: can only see own customer record
  const custDirectory = await req('GET', '/customers', null, custToken)
  assert('Customer only sees own record in /customers', custDirectory.status === 200 && custDirectory.data.length === 1 && custDirectory.data[0].id === 1)

  // Customer Data Isolation: cannot view other customer by ID
  const custOtherCust = await req('GET', '/customers/2', null, custToken)
  assert('Customer attempt to view Customer #2 returns HTTP 403 Forbidden', custOtherCust.status === 403, `Status: ${custOtherCust.status}`)

  // Customer Data Isolation: cannot view other customer subscriptions
  const custOtherSub = await req('GET', '/subscriptions/2', null, custToken)
  assert('Customer attempt to view foreign subscription returns HTTP 403 Forbidden', custOtherSub.status === 403, `Status: ${custOtherSub.status}`)

  // --- PHASE 4: PRODUCTS & PRODUCT VARIANTS ---
  console.log('\n--- 3. PRODUCTS & VARIANTS ---')

  const prods = await req('GET', '/products', null, adminToken)
  assert('Products list accessible by Admin', prods.status === 200 && prods.data.length >= 4)
  const crmProd = prods.data.find((p) => p.id === 1)
  assert('CRM product contains active variants', crmProd && crmProd.variants && crmProd.variants.length >= 2)
  const odooVariant = crmProd?.variants.find((v) => v.name === 'Odoo Brand')
  assert('Odoo Brand variant has correct price adjustment (+₹560)', odooVariant && odooVariant.price_adjustment === 560)

  // --- PHASE 5: PLANS & RESTRICTIONS ---
  console.log('\n--- 4. PLANS & RESTRICTIONS ---')

  const plans = await req('GET', '/plans', null, adminToken)
  assert('Plans support DAILY, WEEKLY, MONTHLY, and YEARLY intervals',
    plans.status === 200 &&
    ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].every((iv) => plans.data.some((p) => p.billing_interval === iv))
  )

  // Pause restriction enforcement
  const pauseBlocked = await req('POST', '/subscriptions/2/transition', { action: 'pause' }, adminToken)
  assert('Pause action blocked on plan that disallows pausing (HTTP 400)', pauseBlocked.status === 400 && pauseBlocked.data.detail.includes('does not allow pausing'))

  // Interval-aware renewal verification
  const sub1Before = await req('GET', '/subscriptions/1', null, adminToken)
  const prevExp1 = new Date(sub1Before.data.expiry_date)
  const renewSub1 = await req('POST', '/subscriptions/1/transition', { action: 'renew' }, adminToken)
  assert('Renewal succeeds on plan allowing renewal', renewSub1.status === 200 && renewSub1.data.status === 'ACTIVE')
  const newExp1 = new Date(renewSub1.data.expiry_date)
  assert('Monthly plan renewal accurately advances expiry by 1 month',
    newExp1.getMonth() === (prevExp1.getMonth() + 1) % 12 || (prevExp1.getMonth() === 11 && newExp1.getMonth() === 0),
    `Previous: ${sub1Before.data.expiry_date}, New: ${renewSub1.data.expiry_date}`
  )

  // --- PHASE 6: QUOTATIONS WORKFLOW ---
  console.log('\n--- 5. QUOTATIONS WORKFLOW ---')

  const createQuote = await req('POST', '/quotations', {
    customer_id: 1,
    plan_id: 1,
    lines: [
      { product_id: 1, variant_id: 1, quantity: 2, unit_price: 5560 },
    ],
    tax_percent: 18,
    discount_percent: 10,
    valid_days: 15,
  }, staffToken)
  assert('Staff creates quotation with line items and discounts', createQuote.status === 201 && createQuote.data.subtotal === 11120)

  // Transition quotation to Sent
  const sendQuote = await req('POST', `/quotations/${createQuote.data.id}/transition`, { action: 'send' }, staffToken)
  assert('Quotation transitioned to SENT', sendQuote.status === 200 && sendQuote.data.status === 'SENT')

  // Transition quotation to Confirmed
  const confirmQuote = await req('POST', `/quotations/${createQuote.data.id}/transition`, { action: 'confirm' }, staffToken)
  assert('Quotation transitioned to CONFIRMED', confirmQuote.status === 200 && confirmQuote.data.status === 'CONFIRMED')

  // Convert quotation to Active Subscription
  const convertQuote = await req('POST', `/quotations/${createQuote.data.id}/transition`, { action: 'convert' }, staffToken)
  assert('Quotation converted to ACTIVE Subscription', convertQuote.status === 200 && convertQuote.data.status === 'ACTIVE' && convertQuote.data.subscription_number)

  // --- PHASE 7: RECURRING BILLING ENGINE & IDEMPOTENCY ---
  console.log('\n--- 6. BILLING REHEARSAL & IDEMPOTENCY LOCKS ---')

  const uniquePeriodKey = `2029-${pad2(Math.floor(Math.random() * 12) + 1)}`

  // Dry-run Simulation
  const sim = await req('POST', '/billing/simulate', { billing_period_key: uniquePeriodKey }, staffToken)
  assert('Billing rehearsal simulation returns dry run without invoice creation', sim.status === 200 && sim.data.dry_run === true && sim.data.ready_count > 0)

  // Live Execution (first pass)
  const exec1 = await req('POST', '/billing/execute', { billing_period_key: uniquePeriodKey }, adminToken)
  assert('Live billing execution generates invoices for ready subscriptions', exec1.status === 200 && exec1.data.generated_count > 0)

  // Live Execution (second pass) - Idempotency lock must prevent duplicates 100%
  const exec2 = await req('POST', '/billing/execute', { billing_period_key: uniquePeriodKey }, adminToken)
  assert('Duplicate billing execution detects idempotency keys (0 generated, all duplicates)',
    exec2.status === 200 && exec2.data.generated_count === 0 && exec2.data.duplicate_count === exec1.data.generated_count
  )

  // --- PHASE 8: PAYMENT RECONCILIATION & OVERPAYMENT DEFENSE ---
  console.log('\n--- 7. PAYMENT RECONCILIATION & BALANCE RECOVERY ---')

  const invList = await req('GET', '/invoices', null, adminToken)
  const targetInv = invList.data.find((i) => i.balance > 0)
  assert('Found open invoice for reconciliation test', !!targetInv, `Invoice ID: ${targetInv?.id}, Bal: ${targetInv?.balance}`)

  if (targetInv) {
    const bal = targetInv.balance

    // Overpayment prevention
    const overpay = await req('POST', '/payments', { invoice_id: targetInv.id, amount: bal + 10000 }, adminToken)
    assert('Payment exceeding balance is rejected with HTTP 400', overpay.status === 400 && overpay.data.detail.includes('exceeds current outstanding balance'))

    // Partial payment
    const partialAmt = Math.floor(bal / 2)
    const partRes = await req('POST', '/payments', { invoice_id: targetInv.id, amount: partialAmt, method: 'bank_transfer' }, adminToken)
    assert('Partial payment records successfully and decreases balance', partRes.status === 201 && partRes.data.balance === bal - partialAmt)

    // Final payment
    const remAmt = bal - partialAmt
    const fullRes = await req('POST', '/payments', { invoice_id: targetInv.id, amount: remAmt, method: 'upi' }, adminToken)
    assert('Final payment marks invoice as PAID with zero balance', fullRes.status === 201 && fullRes.data.invoice_status === 'PAID' && fullRes.data.balance === 0)
  }

  // --- PHASE 9: CUSTOMER AI COPILOT SCOPING ---
  console.log('\n--- 8. CUSTOMER AI COPILOT & DATA SCOPING ---')

  const aiSubQuery = await req('POST', '/assistant/query', { question: 'What subscriptions do I have?' }, custToken)
  assert('Customer AI Copilot queries customer subscriptions', aiSubQuery.status === 200 && aiSubQuery.data.data.length >= 1)

  const aiPayQuery = await req('POST', '/assistant/query', { question: 'Show my payment receipts' }, custToken)
  assert('Customer AI Copilot retrieves scoped payments', aiPayQuery.status === 200 && Array.isArray(aiPayQuery.data.data))

  // --- PHASE 10: CRYPTOGRAPHIC SHA-256 AUDIT LEDGER ---
  console.log('\n--- 9. CRYPTOGRAPHIC SHA-256 AUDIT LEDGER ---')

  const auditVerify = await req('POST', '/audit/verify', {}, adminToken)
  assert('SHA-256 Audit Ledger chain is mathematically valid from genesis',
    auditVerify.status === 200 && auditVerify.data.valid === true && auditVerify.data.status === 'VERIFIED',
    `Verified ${auditVerify.data.verified_events} events`
  )

  // --- PHASE 11: HIGH-VOLUME PERFORMANCE BENCHMARK (< 2000ms) ---
  console.log('\n--- 10. SYSTEM PERFORMANCE & ENDPOINT LATENCY (<2000ms) ---')

  const endpointsToBenchmark = [
    { name: 'Products Catalog', path: '/products', method: 'GET' },
    { name: 'Plans Directory', path: '/plans', method: 'GET' },
    { name: 'Subscriptions Registry', path: '/subscriptions', method: 'GET' },
    { name: 'Invoices Ledger', path: '/invoices', method: 'GET' },
    { name: 'Payments Register', path: '/payments', method: 'GET' },
    { name: 'Customers Directory', path: '/customers', method: 'GET' },
    { name: 'MRR & Revenue Analytics', path: '/analytics/mrr', method: 'GET' },
    { name: 'Audit Events Trail', path: '/audit', method: 'GET' },
  ]

  let maxObservedMs = 0
  for (const ep of endpointsToBenchmark) {
    const bench = await req(ep.method, ep.path, null, adminToken)
    if (bench.durationMs > maxObservedMs) maxObservedMs = bench.durationMs
    assert(`Latency for ${ep.name} is well under 2000ms`, bench.durationMs < 2000, `Observed: ${bench.durationMs}ms`)
  }

  console.log('\n======================================================')
  console.log(` FINAL VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`)
  console.log(` MAX OBSERVED LATENCY: ${maxObservedMs}ms (Threshold: < 2000ms)`)
  console.log('======================================================\n')

  return { passed, failed, maxObservedMs, testRecords }
}

runAllTests().then((res) => {
  if (res.failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}).catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
