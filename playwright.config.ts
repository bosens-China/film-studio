import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:10107",
    browserName: "chromium",
    launchOptions: process.env.CHROME_BIN
      ? { executablePath: process.env.CHROME_BIN }
      : {},
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1",
    url: "http://127.0.0.1:10107",
    reuseExistingServer: true,
  },
});
