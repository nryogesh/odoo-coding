import { api, asArray } from './api'

function normalizeProduct(product) {
  return {
    ...product,
    type: product.product_type,
    active: product.is_active,
  }
}

function normalizePlan(plan) {
  return {
    ...plan,
    billing_interval: String(plan.billing_interval || '').toLowerCase(),
    min_quantity: plan.minimum_quantity,
    active: plan.is_active,
  }
}

export const fetchProducts = () => api.get('/products').then(asArray).then((rows) => rows.map(normalizeProduct))
export const createProduct = (data) => api.post('/products', {
  name: data.name,
  product_type: String(data.product_type || data.type || 'SERVICE').toUpperCase(),
  sales_price: data.sales_price,
  cost_price: data.cost_price ?? 0,
  notes: data.notes ?? null,
  variants: data.variants || [],
})

export const fetchPlans = () => api.get('/plans').then(asArray).then((rows) => rows.map(normalizePlan))
export const createPlan = (data) => api.post('/plans', {
  name: data.name,
  product_id: data.product_id,
  price: data.price,
  billing_interval: String(data.billing_interval || 'monthly').toUpperCase(),
  minimum_quantity: data.minimum_quantity ?? data.min_quantity ?? 1,
  available_from: data.available_from || null,
  available_until: data.available_until || null,
  auto_close: Boolean(data.auto_close),
  allow_early_close: Boolean(data.allow_early_close),
  allow_pause: Boolean(data.allow_pause),
  allow_renewal: Boolean(data.allow_renewal),
})

export const fetchQuotations = () => api.get('/quotations').then(asArray)
export const createQuotation = (data) => {
  const validUntil = data.valid_until || (data.valid_days
    ? new Date(Date.now() + Number(data.valid_days) * 86400000).toISOString().slice(0, 10)
    : null)
  return api.post('/quotations', {
    customer_id: data.customer_id,
    plan_id: data.plan_id ?? null,
    valid_until: validUntil,
    tax_percent: data.tax_percent ?? 0,
    discount_percent: data.discount_percent ?? 0,
    lines: (data.lines || []).map((line) => ({
      product_id: line.product_id,
      variant_id: line.variant_id ?? null,
      quantity: line.quantity,
    })),
  })
}
export const transitionQuotation = (id, action) =>
  api.post(`/quotations/${id}/transition`, { action })

function normalizeSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') return subscription
  const amount = (subscription.lines || []).reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0),
    0,
  )
  return { ...subscription, number: subscription.subscription_number, amount, total: amount }
}

export const fetchSubscriptions = (params) => api.get('/subscriptions', params).then(asArray).then((rows) => rows.map(normalizeSubscription))
export const fetchSubscription = (id) => api.get(`/subscriptions/${id}`).then(normalizeSubscription)
export const createSubscription = (data) => api.post('/subscriptions', data)
export const transitionSubscription = (id, action, payload = {}) =>
  api.post(`/subscriptions/${id}/transition`, { action, ...payload })
export const fetchSubscriptionEvents = (id) => api.get(`/subscriptions/${id}/events`).then(asArray)
export const subscriptionStateAt = (id, at) =>
  api.get(`/subscriptions/${id}/state-at`, at ? { at } : {})
