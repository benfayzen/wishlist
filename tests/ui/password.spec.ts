import { test, expect } from "../fixtures";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

test("password reset: real token, German layout in both themes, new password login", async ({
    anonymousPage: page,
    userData,
    baseURL
}) => {
    test.setTimeout(120000);
    // The test fixture may write only to the dedicated native test database.
    test.skip(baseURL !== "http://127.0.0.1:4280", "This fixture requires the dedicated native test database.");
    const token = randomUUID();
    const database = new DatabaseSync(resolve("data/m3-tests/wishlist.db"));
    database
        .prepare("INSERT INTO password_resets (id, createdAt, userId, hashedToken, redeemed) VALUES (?, ?, ?, ?, 0)")
        .run(randomUUID(), new Date().toISOString(), userData.id, createHash("sha3-256").update(token).digest("hex"));
    database.close();
    await page.context().setExtraHTTPHeaders({ "Accept-Language": "de-DE" });
    await page.addInitScript(() => Object.defineProperty(navigator, "languages", { get: () => ["de-DE"] }));
    for (const width of [320, 768, 1440]) {
        for (const mode of ["light", "dark"]) {
            await page.addInitScript((mode) => localStorage.setItem("mode", JSON.stringify(mode)), mode);
            await page.setViewportSize({ width, height: 900 });
            await page.goto(`/reset-password?token=${token}`);
            await expect(page.locator("#password")).toBeVisible();
            await page.evaluate(async () => {
                await document.fonts.load('400 16px "Google Sans Flex"');
                await document.fonts.ready;
            });
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
        }
    }
    const password = "Changed-M3-Preview-Password!2026";
    await page.locator("#password").fill(password);
    await page.locator("#confirmpassword").fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/login(?:\?|$)/);
    await page.locator("#username").fill(userData.username);
    await page.locator("#password").fill(password);
    await page.locator('form button:not([type="button"])').click();
    await expect(page).toHaveURL(/\/lists/);
});
