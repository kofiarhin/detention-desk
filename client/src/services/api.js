const API_BASE_PATH = '/api'

let authHandlers = {
  onUnauthorized: null,
  onPasswordResetRequired: null,
}

export const setApiAuthHandlers = ({ onUnauthorized, onPasswordResetRequired }) => {
  authHandlers = {
    onUnauthorized: typeof onUnauthorized === 'function' ? onUnauthorized : null,
    onPasswordResetRequired: typeof onPasswordResetRequired === 'function' ? onPasswordResetRequired : null,
  }
}

const normalizePath = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return cleanPath.startsWith('/api/') || cleanPath === '/api'
    ? cleanPath.replace(/^\/api/, '') || '/'
    : cleanPath
}

const buildUrl = (path) => `${API_BASE_PATH}${normalizePath(path)}`

const toUiMessage = (payload, fallbackMessage) => {
  const code = payload?.code || null

  if (code === 'RATE_LIMITED') return 'Too many requests, try again soon'
  if (code === 'CORS_FORBIDDEN' || code === 'FORBIDDEN') {
    return payload?.message || 'Access denied'
  }

  return payload?.message || fallbackMessage
}

const parseResponse = async (response) => {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

const readPayload = async (response) => {
  const payload = await parseResponse(response)

  if (!response.ok) {
    const error = new Error(toUiMessage(payload, 'Request failed'))
    error.status = response.status
    error.code = payload?.code || null
    error.errors = Array.isArray(payload?.errors) ? payload.errors : []

    if (response.status === 401 && authHandlers.onUnauthorized) {
      authHandlers.onUnauthorized(error)
    }

    if (error.code === 'PASSWORD_RESET_REQUIRED' && authHandlers.onPasswordResetRequired) {
      authHandlers.onPasswordResetRequired(error)
    }

    throw error
  }

  return payload
}

export const apiRequest = async ({ path, method = 'GET', body, token, headers = {} }) => {
  const requestHeaders = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  return readPayload(response)
}

export const get = (path, options = {}) => apiRequest({ path, method: 'GET', ...options })
export const post = (path, body, options = {}) => apiRequest({ path, method: 'POST', body, ...options })
export const put = (path, body, options = {}) => apiRequest({ path, method: 'PUT', body, ...options })
export const patch = (path, body, options = {}) => apiRequest({ path, method: 'PATCH', body, ...options })
export const del = (path, options = {}) => apiRequest({ path, method: 'DELETE', ...options })
