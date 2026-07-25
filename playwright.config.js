import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './browser-tests',
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node tools/dev-server.mjs 4173',
    url: 'http://127.0.0.1:4173/demo/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
