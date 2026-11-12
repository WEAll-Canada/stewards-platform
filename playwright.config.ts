import { defineConfig, devices } from "@playwright/test";

const PORT = 4329;

export default defineConfig({
  testDir: "tests",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // `npm run test` builds the site first; this serves that build with the test database.
  webServer: {
    // --ignore-lock keeps Astro in the foreground even when it detects an AI agent.
    command: `npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { LOCAL_STATE_DIR: process.env.LOCAL_STATE_DIR ?? ".wrangler/test-state" },
  },
});
