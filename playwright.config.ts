import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build on port 3100, separate from
// the dev server on 3000. The test server always uses the mock AI, so tests
// never spend credit, and production builds are fast and stable under load.
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  expect: { timeout: 15_000 },
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { AI_PROVIDER: "mock", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, DEMO_STARTS_PER_IP_PER_DAY: "1000" },
  },
});
