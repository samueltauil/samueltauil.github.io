// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4000;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Layout is CSS-only, so the risk is not JavaScript behaviour but how the three
 * rendering engines resolve grid tracks, `ch`, and `clamp()`. One project per
 * engine covers that, plus a phone for the narrow end. Extra viewport sizes are
 * cheaper to assert inside a test than to run as separate projects.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The suite runs against the built output rather than `jekyll serve`. Two
  // reasons: it exercises what actually ships, and Jekyll's WEBrick is single
  // threaded, so parallel runs against it time out clicks in a way that looks
  // like a product bug but is only server contention.
  workers: 4,
  retries: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],

  webServer: {
    command: 'bundle exec jekyll build && npx http-server _site -p 4000 -a 127.0.0.1 --silent -c-1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
