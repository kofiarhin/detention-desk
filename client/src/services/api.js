const API_URL = import.meta.env.VITE_API_URL

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

const buildUrl = (path) => {
  const base = (API_URL || '').replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

const toUiMessage = (payload, fallbackMessage) => {
  const code = payload?.code || null

  if (code === 'RATE_LIMITED') {
    return 'Too many requests, try again soon'
  }

  if (code === 'CORS_FORBIDDEN' || code === 'FORBIDDEN') {
    return payload?.message || 'Access denied'
  }

  return payload?.message || fallbackMessage
}

const readPayload = async (response) => {
  const payload = await response.json().catch(() => null)

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
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  return readPayload(response)
}
