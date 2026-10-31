import { api, asArray } from './api'

export const fetchDashboard = () => api.get('/analytics/dashboard')
export const fetchMRR = () => api.get('/analytics/mrr')
export const fetchChurnRisk = () => api.get('/analytics/churn-risk').then(asArray)
export const fetchAuditEvents = (params) => api.get('/audit/events', params).then(asArray)
export const verifyLedger = () => api.post('/audit/verify')
export const fetchSecurityAlerts = () => api.get('/security/alerts').then(asArray)
export const askAssistant = (question) => api.post('/assistant/query', { question })
