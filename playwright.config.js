const { defineConfig } = require('@playwright/test')

const backendPort = Number(process.env.E2E_BACKEND_PORT || 5001)
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 4001)
module.exports = defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  webServer: [
    {
      command: 'node e2e/scripts/start-test-server.js',
      url: `http://127.0.0.1:${backendPort}/ready`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(backendPort),
        JWT_SECRET: process.env.JWT_SECRET || 'e2e-jwt-secret',
        CORS_ORIGINS: `http://127.0.0.1:${frontendPort},http://localhost:${frontendPort}`,
        E2E_RESET_SECRET: process.env.E2E_RESET_SECRET || 'detentiondesk-e2e-secret',
      },
      timeout: 120 * 1000,
    },
    {
      command: `npm run dev --prefix client -- --host 0.0.0.0 --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        VITE_API_URL: `http://127.0.0.1:${backendPort}`,
      },
      timeout: 120 * 1000,
    },
  ],
})
