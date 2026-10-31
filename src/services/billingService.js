import { api, asArray } from './api'

export const simulateBilling = ({ billing_period_key, period } = {}) =>
  api.post('/billing/simulate', { billing_period_key: billing_period_key || period || undefined })

export const executeBilling = ({ billing_period_key, period, confirm } = {}) =>
  api.post('/billing/execute', { billing_period_key: billing_period_key || period || undefined, confirm: Boolean(confirm) })

export const fetchInvoices = (params) => api.get('/invoices', params).then(asArray)
export const fetchInvoice = (id) => api.get(`/invoices/${id}`)
export const confirmInvoice = (id) => api.post(`/invoices/${id}/confirm`)
export const cancelInvoice = (id) => api.post(`/invoices/${id}/cancel`)
export const fetchInvoiceBalance = (id) => api.get(`/invoices/${id}/balance`)

export const fetchPayments = (params) => api.get('/payments', params).then(asArray)
export const createPayment = (data) => api.post('/payments', data)
