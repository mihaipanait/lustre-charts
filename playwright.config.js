import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './browser-tests',
  fullyParallel: true,
  // PMREM generation is intentionally GPU-heavy. Chromium's software renderer
  // can take well over a minute for the demo's real 1024px showcase path.
  timeout: 180_000,
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
