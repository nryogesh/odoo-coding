import { api, setToken } from './api'

function normalizeUser(raw) {
  if (!raw) return null
  const u = raw.user || raw
  return {
    id: u.id,
    name: u.name || u.full_name || u.email,
    email: u.email,
    role: (u.role || '').toUpperCase(),
    customerId: u.customer_id ?? u.customerId ?? null,
  }
}

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password })
  const token = res.access_token || res.token
  if (!token) throw new Error('Login response did not include an access token')
  setToken(token)
  const me = await api.get('/auth/me').catch(() => null)
  return { token, user: normalizeUser(me) || { email, role: '' } }
}

export async function register(name, email, password) {
  return api.post('/auth/register', { name, email, password })
}

export async function fetchMe() {
  return normalizeUser(await api.get('/auth/me'))
}

export function logout() {
  setToken(null)
}
