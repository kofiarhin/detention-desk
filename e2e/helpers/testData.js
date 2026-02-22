const RESET_SECRET = process.env.E2E_RESET_SECRET || 'detentiondesk-e2e-secret'
const BACKEND_URL = process.env.E2E_BACKEND_URL || `http://127.0.0.1:${process.env.E2E_BACKEND_PORT || 5001}`

const seedData = async (request) => {
  const response = await request.post(`${BACKEND_URL}/api/test/seed`, {
    headers: { 'x-reset-secret': RESET_SECRET },
  })

  if (!response.ok()) {
    throw new Error(`Failed to seed test data: ${response.status()} ${await response.text()}`)
  }

  const payload = await response.json()
  return payload.data
}

module.exports = {
  seedData,
}
