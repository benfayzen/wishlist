import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    workers: 2,
    retries: 0,
    reporter: [["list"], ["html", { open: "never" }]],
    use: { baseURL: "http://127.0.0.1:4280", trace: "retain-on-failure" },
    projects: [
        { name: "setup", testMatch: /global\.setup\.ts/ },
        { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] }
    ],
    webServer: {
        command: "node scripts/native-server.mjs --test",
        wait: { stdout: /Listening on http:\/\/127\.0\.0\.1:4280/ },
        reuseExistingServer: false,
        timeout: 300000,
        gracefulShutdown: { signal: "SIGTERM", timeout: 15000 }
    }
});
