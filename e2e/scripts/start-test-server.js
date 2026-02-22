const { MongoMemoryServer } = require('mongodb-memory-server')

const { validateStartupConfig } = require('../../server/config/env')
const { connectDB } = require('../../server/config/db')
const { buildApp } = require('../../server/app')

const port = Number(process.env.E2E_BACKEND_PORT || process.env.PORT || 5001)

let memoryServer = null

const start = async () => {
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI_TEST) {
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'detentiondesk_e2e' } })
    process.env.MONGO_URI = memoryServer.getUri()
  }

  if (!process.env.MONGO_URI && process.env.MONGODB_URI_TEST) {
    process.env.MONGO_URI = process.env.MONGODB_URI_TEST
  }

  process.env.NODE_ENV = 'test'
  process.env.PORT = String(port)
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret'

  const config = validateStartupConfig()
  await connectDB(config.mongoUri)
  const app = buildApp()

  const server = app.listen(port, () => {
    console.log(`[e2e] test server listening on ${port}`)
  })

  const shutdown = async () => {
    await new Promise((resolve) => server.close(resolve))
    if (memoryServer) {
      await memoryServer.stop()
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch(async (error) => {
  console.error('[e2e] failed to start test server', error)
  if (memoryServer) {
    await memoryServer.stop()
  }
  process.exit(1)
})
