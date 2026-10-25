import { test, expect } from "../fixtures";

for (const width of [320, 390, 600, 617, 768, 839, 840, 1440]) {
    test(`account menu adapts and restores focus at ${width}px`, async ({ page, userData }) => {
        await page.setViewportSize({ width, height: 740 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/account");
        const trigger = page.getByRole("button", { name: "User Menu" });
        await trigger.click();
        const panel = page.getByRole("dialog", { name: "Account", exact: true });
        await expect(panel).toBeVisible();
        await expect(panel).toHaveAttribute("aria-modal", "true");
        await expect(panel.locator(".m3-account-name")).toHaveText(userData.name);
        const box = (await panel.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(740);
        if (width < 840) {
            expect(box).toMatchObject({ x: 0, y: 0, width, height: 740 });
            await expect(panel).toHaveCSS("border-radius", "0px");
        } else {
            expect(box.width).toBe(448);
            await expect(panel).toHaveCSS("border-radius", "28px");
        }
        for (const mode of ["light", "dark"]) {
            await panel.getByRole("button", { name: mode === "light" ? "Light" : "Dark", exact: true }).click();
            await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
            const body = panel.locator(".m3-account-body");
            expect(await body.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
        }
        const close = panel.getByRole("button", { name: "close", exact: true });
        await close.focus();
        await page.keyboard.press("Shift+Tab");
        await expect(panel.getByRole("button", { name: "Sign out", exact: true })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(close).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(trigger).toBeFocused();
        await trigger.click();
        await panel.getByRole("button", { name: "close", exact: true }).click();
        await expect(panel).toBeHidden();
        await expect(trigger).toBeFocused();
    });
}

test("account actions hand off to dialogs and navigation on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto("/lists");
    const trigger = page.getByRole("button", { name: "User Menu" });
    const panel = page.getByRole("dialog", { name: "Account", exact: true });
    await trigger.click();
    await panel.getByRole("button", { name: "Language", exact: true }).click();
    const language = page.getByRole("dialog", { name: "Choose a language" });
    await expect(language).toBeVisible();
    await expect(panel).toBeHidden();
    await language.getByRole("button", { name: "Cancel", exact: true }).click();
    await trigger.click();
    await panel.getByRole("button", { name: "Create Group", exact: true }).click();
    const group = page.getByRole("dialog", { name: "Enter Group Name" });
    await expect(group).toBeVisible();
    await expect(panel).toBeHidden();
    await group.getByRole("button", { name: "Cancel", exact: true }).click();
    await trigger.click();
    await panel.getByRole("link", { name: "Account", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(panel).toBeHidden();
});

test("account menu keeps close visible with long identity text and a short viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/lists");
    await page.getByRole("button", { name: "User Menu" }).click();
    const panel = page.getByRole("dialog", { name: "Account", exact: true });
    await panel.locator(".m3-account-name").evaluate((el) => (el.textContent = "VeryLongAccountName".repeat(5)));
    await panel
        .locator(".m3-account-email")
        .evaluate((el) => (el.textContent = "long-email-address".repeat(5) + "@example.test"));
    const body = panel.locator(".m3-account-body");
    expect(await body.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await panel.getByRole("button", { name: "Sign out", exact: true }).scrollIntoViewIfNeeded();
    const close = panel.getByRole("button", { name: "close", exact: true });
    await expect(close).toBeInViewport();
    await close.click();
    await expect(panel).toBeHidden();
});
