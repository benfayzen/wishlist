import { chromium, expect } from "@playwright/test";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseURL = "http://127.0.0.1:4183";
const existingServer = process.argv.includes("--existing-server");
if (!existingServer) {
    await new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once("error", reject);
        probe.listen(4183, "127.0.0.1", () => probe.close(resolve));
    });
}
const server = existingServer
    ? undefined
    : spawn(process.execPath, ["scripts/readme-server.mjs"], { cwd: root, stdio: "inherit" });
let browser;
const errors = [];
try {
    for (let attempt = 0; attempt < 120; attempt++) {
        if (server && server.exitCode !== null) throw new Error("Documentation server failed to start.");
        try {
            if ((await fetch(`${baseURL}/login`, { signal: AbortSignal.timeout(1000) })).ok) break;
        } catch {
            /* Wait for migrations, image downloads and the local server. */
        }
        if (attempt === 119) throw new Error("Documentation server did not become ready.");
        await delay(1000);
    }
    browser = await chromium.launch();
    const context = await browser.newContext({
        baseURL,
        viewport: { width: 1440, height: 960 },
        locale: "en-US",
        deviceScaleFactor: 1,
        reducedMotion: "reduce"
    });
    await context.addInitScript(() => localStorage.setItem("mode", JSON.stringify("light")));
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/login");
    await page.locator("#username").fill("demo.stan");
    await page.locator("#password").fill("SouthPark2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/lists");

    async function ready(currentPage = page) {
        await currentPage.evaluate(async () => {
            await document.fonts.load('400 16px "Google Sans Flex"');
            await document.fonts.ready;
        });
        await expect(currentPage.locator("html")).toHaveAttribute("lang", "en");
        await currentPage.waitForFunction(() =>
            [...document.querySelectorAll("iconify-icon")]
                .filter((el) => {
                    const r = el.getBoundingClientRect();
                    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                    return (
                        r.width > 0 &&
                        r.bottom > 0 &&
                        r.top < innerHeight &&
                        top &&
                        (top === el || top.contains(el) || el.contains(top))
                    );
                })
                .every((el) => el.shadowRoot?.querySelector("svg"))
        );
        await currentPage.waitForFunction(() =>
            [...document.images]
                .filter((img) => {
                    const r = img.getBoundingClientRect();
                    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
                })
                .every((img) => img.complete && img.naturalWidth > 0)
        );
        const overflow = await currentPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        if (overflow) throw new Error(`Horizontal overflow at ${currentPage.url()}`);
    }
    async function shot(name) {
        await ready();
        await page.mouse.move(0, 0);
        await page.screenshot({ path: resolve(root, "assets", name), animations: "disabled" });
        console.log(`Captured ${name}`);
    }
    async function group(key) {
        const response = await context.request.patch(`/api/users/readme-stan/groups/readme-${key}`, {
            data: { active: true },
            headers: { Origin: baseURL }
        });
        expect(response.ok()).toBeTruthy();
        await page.goto("/lists");
    }
    await group("family");
    await expect(page.getByTestId("list-card")).toHaveCount(6);
    await shot("homepage-desktop.png");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("homepage-mobile.png");
    await page.goto("/lists/readme-stan-winter");
    await expect(page.getByTestId("item-card").first()).toBeVisible();
    await page.getByTitle("List View", { exact: true }).click();
    await expect(page.getByTestId("item-card").first().locator(".m3-item-row")).toBeVisible();
    await expect(page.getByTestId("item-card").first().locator(".m3-item-media")).toBeHidden();
    await shot("my-wishes-mobile.png");
    await page.goto("/lists/readme-shelly-music");
    await page.getByTitle("List View", { exact: true }).click();
    await expect(page.getByTestId("item-card").first().locator(".m3-item-row")).toBeVisible();
    await expect(page.getByTestId("item-card").first().locator(".m3-item-media")).toBeHidden();
    await shot("wishes-mobile.png");
    await page.goto("/lists");
    await page.getByRole("button", { name: "User Menu", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot("account-menu-mobile.png");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/claims?users=readme-shelly");
    await expect(page.getByTestId("item-card").first()).toBeVisible();
    await page.getByTitle("Tile View", { exact: true }).click();
    await page.getByRole("button", { name: "User", exact: true }).click();
    await shot("claims-desktop.png");
    await page.setViewportSize({ width: 1440, height: 1600 });
    await page.goto("/lists/readme-stan-birthday/create-item");
    await page.locator("#name").fill("Adventure backpack");
    await page.locator("#formatted-price").fill("69.95");
    await page.locator("#quantity").fill("1");
    await page.locator("#note").fill("A sturdy daypack for snowy trails and weekend adventures. Blue, please!");
    await page
        .locator('input[type="file"][name="image"]')
        .setInputFiles(resolve(root, "data/readme-demo/uploads/readme-backpack.jpg"));
    await shot("wish-form.png");
    await page.setViewportSize({ width: 1440, height: 960 });
    await group("friends");
    await expect(page.getByTestId("list-card")).toHaveCount(5);
    // Use the real group picker to show that the same account belongs to both groups.
    await page.getByRole("button", { name: "South Park Friends", exact: true }).click();
    await expect(page.getByRole("button", { name: "Marsh Family", exact: true })).toBeVisible();
    await shot("friends-desktop.png");
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.setItem("mode", JSON.stringify("dark")));
    // A fresh document reads the persisted theme. Remove the default light init script by using a second page.
    const darkContext = await browser.newContext({
        baseURL,
        storageState: await context.storageState(),
        viewport: { width: 1920, height: 960 },
        locale: "en-US",
        reducedMotion: "reduce"
    });
    const darkPage = await darkContext.newPage();
    darkPage.on("pageerror", (error) => errors.push(error.message));
    await darkPage.goto("/lists/readme-kenny-outdoor");
    await darkPage.getByTitle("Tile View", { exact: true }).click();
    await ready(darkPage);
    await expect(darkPage.locator("html")).toHaveAttribute("data-mode", "dark");
    await darkPage.screenshot({ path: resolve(root, "assets/wishes-desktop-dark.png"), animations: "disabled" });
    console.log("Captured wishes-desktop-dark.png");
    await group("family");
    if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
} finally {
    await browser?.close();
    server?.kill("SIGTERM");
}
