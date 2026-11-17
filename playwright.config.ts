import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: '.artifacts/test-results',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: process.env.GATE_TEST_URL || 'http://localhost:8082',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
});
