import { defineConfig, devices } from '@playwright/test';

// One preview server of the production build. Engines: Chromium, Firefox, and WebKit (the Safari ENGINE under automation: not the Safari app).
const BASE = 'http://127.0.0.1:4321/digital-watch-webpage/';
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: BASE, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve-dist.mjs', url: BASE, reuseExistingServer: false, timeout: 60_000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 14'] } },
  ],
});
