/**
 * SubSecure AI Client API
 * Connects frontend views to the secure persistent server-side API (/api/v1/*).
 */

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

async function request(method, path, body, params) {
  let url = path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? '' : '/'}${path}`
  if (params && Object.keys(params).length > 0) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v))
    }
    const qs = q.toString()
    if (qs) url += `?${qs}`
  }

  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new ApiError(res.status, data || { detail: res.statusText })
  }

  return data
}

export const api = {
  get: (path, params) => request('GET', path, undefined, params),
  post: (path, body) => request('POST', path, body, undefined),
  put: (path, body) => request('PUT', path, body, undefined),
  patch: (path, body) => request('PATCH', path, body, undefined),
  delete: (path) => request('DELETE', path, undefined, undefined),
}
