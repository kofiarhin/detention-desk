import { clearSession, getToken } from './auth'

const UnauthorizedError = class extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

const readErrorMessage = (payload) => {
  if (!payload) {
    return 'Request failed'
  }

  if (payload.error?.message) {
    return payload.error.message
  }

  if (payload.message) {
    return payload.message
  }

  return 'Request failed'
}

export const apiRequest = async (path, options = {}) => {
  const token = getToken()

  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (response.status === 401) {
    clearSession()
    throw new UnauthorizedError(readErrorMessage(payload))
  }

  if (!response.ok) {
    throw new Error(readErrorMessage(payload))
  }

  return payload?.data
}

export const isUnauthorizedError = (error) => error?.name === 'UnauthorizedError'
