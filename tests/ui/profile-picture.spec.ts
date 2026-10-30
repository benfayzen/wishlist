import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";

async function openOAuthProfile(page: Page) {
    // Simulate the linked provider's page data without requiring an external IdP.
    // Authentication, image processing and persistence still use the real application.
    await page.route("**/account/__data.json*", async (route) => {
        const response = await route.fetch();
        const payload = await response.json();
        for (const node of payload.nodes) {
            if (node?.type !== "data") continue;
            const values = node.data;
            const metadata = values.find((value: any) => value && typeof value === "object" && "oidcConfig" in value);
            if (!metadata) continue;
            const config = values[metadata.oidcConfig];
            config.ready = values.push(true) - 1;
            config.enableSync = values.push(true) - 1;
            values[metadata.user].oauthId = values.push("profile-picture-test") - 1;
        }
        await route.fulfill({ response, json: payload });
    });
    await page.getByRole("button", { name: "User Menu" }).click();
    await page
        .getByRole("dialog", { name: "Account", exact: true })
        .getByRole("link", { name: "Account", exact: true })
        .click();
}

for (const width of [390, 1440]) {
    test(`OAuth-managed profile can save a picture at ${width}px`, async ({ page, userData }) => {
        await page.setViewportSize({ width, height: 900 });
        await openOAuthProfile(page);
        await expect(page.locator('input[name="name"]')).toBeDisabled();
        await expect(page.locator('input[name="username"]')).toBeDisabled();
        await expect(page.locator('input[name="email"]')).toBeDisabled();
        await expect(page.getByText("This profile is managed by your OAuth provider.")).toBeVisible();
        await expect(page.locator('#profile button[type="submit"]')).toBeDisabled();

        const pictureForm = page.locator("#profile");
        const save = pictureForm.getByRole("button", { name: /^Save/ });
        const fileInput = page.locator('input[name="profilePic"]');
        await expect(save).toBeDisabled();
        await fileInput.setInputFiles("tests/fixtures/product.png");
        await expect(save).toBeEnabled();
        await page.locator('[data-part="item-delete-trigger"]').click();
        await expect(save).toBeDisabled();
        await fileInput.setInputFiles("tests/fixtures/product.png");
        const uploaded = page.waitForResponse(
            (response) => response.url().includes("?/profilePicture") && response.request().method() === "POST"
        );
        await save.click();
        expect((await uploaded).status()).toBe(200);
        await expect(save).toBeDisabled();
        const avatar = page.locator(".m3-profile-hero img");
        await expect(avatar).toHaveAttribute("src", /\/api\/assets\/.+\.webp$/);
        await expect(avatar).toBeVisible();
        expect(await avatar.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
        const picture = await avatar.getAttribute("src");
        await page.locator("#main").getByRole("heading", { name: "Account", exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath("oauth-profile.png"), fullPage: true });
        await page.reload();
        await expect(avatar).toHaveAttribute("src", picture!);
        await expect(avatar).toBeVisible();
        await expect(page.locator('input[name="name"]')).toHaveValue(userData.name);
        await expect(page.locator('input[name="username"]')).toHaveValue(userData.username);
        await expect(page.locator('input[name="email"]')).toHaveValue(userData.email);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
}

test("an empty OAuth profile picture reports failure and keeps the selection for retry", async ({ page }) => {
    await openOAuthProfile(page);
    const form = page.locator("#profile");
    await page
        .locator('input[name="profilePic"]')
        .setInputFiles({ name: "empty.png", mimeType: "image/png", buffer: Buffer.alloc(0) });
    const save = form.getByRole("button", { name: /^Save/ });
    await save.click();
    await expect(page.getByText("Unable to upload profile picture. Please choose a valid image.")).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(page.locator('[data-part="item-name"]')).toHaveText("empty.png");
});

test("a local account can save profile details and a picture together", async ({ page }) => {
    await page.goto("/account");
    await page.locator('input[name="name"]').fill("Updated Profile Name");
    await page.locator('input[name="profilePic"]').setInputFiles("tests/fixtures/product.png");
    await page.locator('#profile button[type="submit"]').click();
    await expect(page.locator(".m3-profile-hero img")).toHaveAttribute("src", /\/api\/assets\/.+\.webp$/);
    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue("Updated Profile Name");
    await expect(page.locator(".m3-profile-hero img")).toHaveAttribute("src", /\/api\/assets\/.+\.webp$/);
});
