import { test, expect } from "../fixtures";

for (const width of [320, 768, 839, 840, 1024, 1440]) {
    test(`adaptive navigation at ${width}px works without installation`, async ({ page, userData }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/lists?sort=name");
        expect((await page.locator(".m3-nav").boundingBox())!.height).toBeGreaterThanOrEqual(64);
        await expect(page.locator("header").getByRole("heading", { level: 1 })).toHaveText(await page.title());
        await expect(page.locator("header h1")).toHaveAttribute("title", await page.title());
        if (width < 640) {
            await expect(page.locator("header h1 span")).toHaveCSS("white-space", "nowrap");
            await expect(page.locator("header h1 span")).toHaveCSS("text-overflow", "ellipsis");
        }
        await expect(page.locator("#main").getByRole("heading", { level: 1 })).toHaveCount(0);
        await expect(page.locator(".m3-content-pane")).toHaveCSS("border-top-left-radius", "28px");
        const logo = page.locator(".m3-app-logo:visible");
        await expect(logo).toHaveCount(width >= 840 ? 1 : 0);
        const navigation = page.getByRole("navigation", { name: "Main navigation" }).filter({ visible: true });
        await expect(navigation).toHaveCount(1);
        await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
        await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute("href", "/lists");
        const toggle = page.getByRole("button", { name: "Expand navigation", exact: true });
        if (width >= 840) {
            await expect(logo).toHaveCSS("border-radius", "12px");
            await expect
                .poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
                .toBeTruthy();
            await expect(toggle).toBeVisible();
            expect((await toggle.boundingBox())!.y).toBeGreaterThanOrEqual((await logo.boundingBox())!.y + 56);
            const before = await page.locator("#main").boundingBox();
            await toggle.focus();
            await page.keyboard.press("Enter");
            await expect(page.getByRole("button", { name: "Collapse navigation" })).toHaveAttribute(
                "aria-expanded",
                "true"
            );
            await expect
                .poll(async () => (await page.locator("#main").boundingBox())!.x)
                .toBeGreaterThan(before!.x + 100);
        } else {
            await expect(toggle).toBeHidden();
            await expect(page.locator(".m3-navigation-bar")).toBeVisible();
        }
        await navigation.getByRole("link", { name: "Lists", exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`users=${userData.id}`));
        await page.goto(`/lists?sort=name&users=${userData.id}`);
        await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
        await expect(navigation.locator('[aria-current="page"]')).toContainText("Lists");
        await navigation.getByRole("link", { name: "Claims", exact: true }).click();
        await expect(page).toHaveURL(/\/claims$/);
        await expect(page.locator("header").getByRole("heading", { level: 1 })).toHaveText(await page.title());
        await expect(navigation.locator('[aria-current="page"]')).toContainText("Claims");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
        const items = await navigation.getByRole("link").all();
        for (const item of items) {
            const box = await item.boundingBox();
            expect(box!.height).toBeGreaterThanOrEqual(48);
            expect(box!.width).toBeGreaterThanOrEqual(48);
        }
        await page.emulateMedia({ reducedMotion: "reduce" });
        expect(await page.locator(".m3-app-shell").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe(
            "0s"
        );
    });
}

test("connected view selection is exclusive, keyboard accessible and survives reload", async ({ page }) => {
    await page.goto("/lists");
    const href = await page.getByTestId("list-card").first().getAttribute("href");
    await page.goto(href!);
    const group = page.getByRole("group", { name: "View layout" });
    const tile = group.getByRole("button", { name: "Tile View", exact: true });
    const list = group.getByRole("button", { name: "List View", exact: true });
    await tile.focus();
    await page.keyboard.press("Space");
    await expect(tile).toHaveAttribute("aria-pressed", "true");
    await expect(list).toHaveAttribute("aria-pressed", "false");
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
    await tile.click();
    await expect(tile).toHaveAttribute("aria-pressed", "true");
    expect((await page.context().cookies()).find((cookie) => cookie.name === "listViewPreference")?.value).toBe("tile");
    await page.reload();
    await expect(tile).toHaveAttribute("aria-pressed", "true");
    await list.focus();
    await page.keyboard.press("Enter");
    await expect(list).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(list).toHaveAttribute("aria-pressed", "true");
    for (const width of [320, 768]) {
        await page.setViewportSize({ width, height: 900 });
        const bar = await page.locator(".m3-navigation-bar").boundingBox();
        const fab = await page.getByRole("button", { name: "Create item" }).boundingBox();
        expect(fab!.y + fab!.height).toBeLessThanOrEqual(bar!.y - 8);
    }
});

test("theme selection persists and system follows changes with account menu closed", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/lists");
    const menu = page.getByRole("button", { name: "User Menu" });
    await menu.click();
    const group = page.getByRole("group", { name: "Mode", exact: true });
    const surfaces = await group.locator(".m3-connected-button-surface").evaluateAll((elements) =>
        elements.map((el) => {
            const box = el.getBoundingClientRect();
            return { left: box.left, right: box.right };
        })
    );
    expect(surfaces[1].left - surfaces[0].right).toBeCloseTo(2, 0);
    expect(surfaces[2].left - surfaces[1].right).toBeCloseTo(2, 0);
    await group.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await menu.click();
    await expect(group.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "System", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await page.keyboard.press("Escape");
    await expect(group).toBeHidden();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
});

test("list filter aligns with its trigger and stays above navigation", async ({ page, userData }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lists");
    for (const expanded of [false, true]) {
        if (expanded) await page.getByRole("button", { name: "Expand navigation", exact: true }).click();
        for (const mode of ["light", "dark"]) {
            await page.evaluate((mode) => (document.documentElement.dataset.mode = mode), mode);
            await page.getByTestId("list-filter").getByRole("button").click();
            const menu = page.locator('[data-scope="popover"][data-part="content"][data-state="open"]');
            await expect(menu).toBeVisible();
            await expect
                .poll(async () => {
                    const popup = await menu.boundingBox();
                    const trigger = await page.getByTestId("list-filter").getByRole("button").boundingBox();
                    return Math.abs(popup!.x - trigger!.x);
                })
                .toBeLessThan(0.5);
            const position = await menu.evaluate((el) => {
                const popup = el.getBoundingClientRect();
                const trigger = document.querySelector('[data-testid="list-filter"] button')!.getBoundingClientRect();
                const rail = document.querySelector(".m3-navigation-rail")!;
                const positioner = el.closest('[data-part="positioner"]')!;
                return {
                    left: popup.left,
                    triggerLeft: trigger.left,
                    layer: Number(getComputedStyle(positioner).zIndex),
                    railLayer: Number(getComputedStyle(rail).zIndex),
                    menuOnTop: el.contains(document.elementFromPoint(popup.left + 16, popup.top + popup.height / 2))
                };
            });
            expect(position.left).toBeCloseTo(position.triggerLeft, 0);
            expect(position.layer).toBeGreaterThan(position.railLayer);
            expect(position.menuOnTop).toBeTruthy();
            await menu.getByRole("checkbox", { name: userData.name, exact: true }).check();
            await menu.locator("#apply").click();
            await expect(menu).toBeHidden();
            await expect(page).toHaveURL(new RegExp(`users=${userData.id}`));
            await page.getByTestId("list-filter").getByRole("button").click();
            await menu.getByRole("checkbox", { name: "All", exact: true }).check();
            await menu.locator("#apply").click();
            await expect(page).toHaveURL(/\/lists$/);
        }
    }
});
