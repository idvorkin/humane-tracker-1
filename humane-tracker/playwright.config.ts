import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

const PORT = process.env.E2E_PORT || '3001';
// Detect if running in container (HTTPS) or locally (HTTP)
const isContainer = existsSync('/.dockerenv') || process.env.container !== undefined;
const PROTOCOL = isContainer ? 'https' : 'http';
const BASE_URL = `${PROTOCOL}://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Ignore HTTPS certificate errors in container (self-signed cert)
    ignoreHTTPSErrors: isContainer,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
    // Ignore HTTPS certificate errors when checking server readiness
    ignoreHTTPSErrors: isContainer,
  },
});