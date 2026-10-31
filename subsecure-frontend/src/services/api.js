const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const TOKEN_KEY = 'subsecure_token'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) }

// Tolerant unwrap: FastAPI may return a bare array or a paginated {items: [...]} object.
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

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE_URL.replace(/\/$/, '') + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError(0, { detail: 'Cannot reach the backend. Is FastAPI running on port 8000?' })
  }

  if (res.status === 401) {
    setToken(null)
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login?session=expired')
    }
  }
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { detail: text } }
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
}
