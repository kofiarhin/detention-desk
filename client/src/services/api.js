const API_URL = import.meta.env.VITE_API_URL

const buildUrl = (path) => {
  const base = (API_URL || '').replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

const readPayload = async (response) => {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed')
    error.status = response.status
    error.code = payload?.code || null
    error.errors = payload?.errors || []
    throw error
  }

  return payload
}

export const apiRequest = async ({ path, method = 'GET', body, token }) => {
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  return readPayload(response)
}
