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
        await page.goto(`/lists?groups=readme-${key}`);
    }

    // 1. Homepage desktop overview (Marsh Family)
    await group("family");
    await expect(page.getByTestId("list-card")).toHaveCount(6);
    await shot("homepage-desktop.png");

    // 2. Homepage mobile overview
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("homepage-mobile.png");

    // 3. Mobile list view: Stan's own wishes
    await page.goto("/lists/readme-stan-winter");
    await expect(page.getByTestId("item-card").first()).toBeVisible();
    await page.getByTitle("List View", { exact: true }).click();
    await expect(page.getByTestId("item-card").first().locator(".m3-item-row")).toBeVisible();
    await expect(page.getByTestId("item-card").first().locator(".m3-item-media")).toBeHidden();
    await shot("my-wishes-mobile.png");

    // 4. Mobile tile view: Shelly's wishes with South Park artwork and claim controls
    await page.goto("/lists/readme-shelly-music");
    await page.getByTitle("Tile View", { exact: true }).click();
    await expect(page.getByTestId("item-card").first().locator(".m3-tile-media")).toBeVisible();
    await shot("wishes-mobile.png");

    // 5. Account menu sheet on mobile
    await page.goto("/lists");
    await page.getByRole("button", { name: "User Menu", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot("account-menu-mobile.png");
    await page.keyboard.press("Escape");

    // 6. Claims desktop view
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/claims?users=readme-shelly");
    await expect(page.getByTestId("item-card").first()).toBeVisible();
    await page.getByTitle("Tile View", { exact: true }).click();
    await page.getByRole("button", { name: "User", exact: true }).click();
    await shot("claims-desktop.png");

    // 7. Wish creation form with South Park Okama GameSphere
    await page.setViewportSize({ width: 1440, height: 1600 });
    await page.goto("/lists/readme-stan-birthday/create-item");
    await page.locator("#name").fill("Okama GameSphere");
    await page.locator("#formatted-price").fill("299.00");
    await page.locator("#quantity").fill("1");
    await page
        .locator("#note")
        .fill(
            "The one with the green glow. 128-bit gaming with 128 times more graphics! Any controller color is great."
        );
    await page
        .locator('input[type="file"][name="image"]')
        .setInputFiles(resolve(root, "data/readme-demo/uploads/readme-gamesphere.jpg"));
    await shot("wish-form.png");

    // 8. Multi-group list configuration: Stan's Birthday shared across Family and Friends
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/lists/readme-stan-birthday/manage");
    await page.getByRole("button", { name: /Select groups/ }).click();
    await expect(page.getByTestId("list-group-options")).toBeVisible();
    await shot("list-sharing-desktop.png");
    await page.keyboard.press("Escape");

    // 9. South Park Friends group overview with group filter open
    await group("friends");
    await expect(page.getByTestId("list-card")).toHaveCount(6);
    await page.getByTestId("overview-group-filter").getByRole("button").click();
    await expect(page.getByRole("checkbox", { name: "Marsh Family", exact: true })).toBeVisible();
    await shot("friends-desktop.png");
    await page.keyboard.press("Escape");

    // 10. Public Registry: South Park Elementary Toy Drive
    await page.goto("/lists/readme-toy-drive");
    await expect(page.getByTestId("item-card").first()).toBeVisible();
    await shot("registry-desktop.png");

    // 11. Dark mode list view: Kenny's Adventure Kit
    await page.evaluate(() => localStorage.setItem("mode", JSON.stringify("dark")));
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
