import { test, expect } from "../fixtures";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

async function ready(page: Page) {
    await page.evaluate(async () => {
        await document.fonts.load('400 16px "Google Sans Flex"');
        await document.fonts.ready;
    });
    expect(await page.evaluate(() => document.fonts.check('400 16px "Google Sans Flex"'))).toBeTruthy();
}
async function fits(page: Page) {
    await ready(page);
    const overflow = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    expect(overflow.document, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
    const contrast = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const luminance = (hex: string) => {
            const channels = hex
                .trim()
                .slice(1)
                .match(/../g)!
                .map((v) => parseInt(v, 16) / 255)
                .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        return [
            ["primary", "on-primary"],
            ["secondary-container", "on-secondary-container"],
            ["surface", "on-surface"],
            ["error", "on-error"]
        ].map(([a, b]) => {
            const first = luminance(style.getPropertyValue(`--md-${a}`)),
                second = luminance(style.getPropertyValue(`--md-${b}`));
            return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
        });
    });
    for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
    for (const field of await page.locator("input.m3-field-input:visible").all()) {
        expect(await field.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");
    }
}
async function ownList(page: Page) {
    await page.goto("/lists");
    const href = await page.getByTestId("list-card").first().getAttribute("href");
    expect(href).toBeTruthy();
    return href!;
}
for (const width of [320, 768, 1440]) {
    for (const mode of ["light", "dark"] as const) {
        test(`German ${width}px ${mode}: forms, administration, dialog and shared fields`, async ({
            page,
            adminPage,
            anonymousPage
        }) => {
            test.setTimeout(120000);
            for (const current of [page, adminPage, anonymousPage]) {
                await current.setViewportSize({ width, height: 900 });
                await current.context().setExtraHTTPHeaders({ "Accept-Language": "de-DE" });
                await current.addInitScript((mode) => {
                    localStorage.setItem("mode", JSON.stringify(mode));
                    Object.defineProperty(navigator, "languages", { get: () => ["de-DE"] });
                }, mode);
            }
            const list = await ownList(page);
            for (const route of ["/lists", `${list}/create-item`, `${list}/manage`, "/account", "/account#security"]) {
                await page.goto(route);
                await fits(page);
            }
            await page.goto("/account");
            await page.getByRole("tab").nth(1).click();
            await fits(page);
            for (const route of [
                "/admin/users",
                "/admin/groups",
                "/admin/settings#general",
                "/admin/settings#security",
                "/admin/settings#email"
            ]) {
                await adminPage.goto(route);
                if (route.startsWith("/admin/settings")) {
                    const mobileNavigation = adminPage.getByRole("combobox", { name: "Administration", exact: true });
                    if (await mobileNavigation.isVisible()) await expect(mobileNavigation).toHaveValue("settings");
                    else
                        await expect(
                            adminPage.getByRole("tab", { name: "Einstellungen", exact: true })
                        ).toHaveAttribute("aria-selected", "true");
                }
                await fits(adminPage);
            }
            for (const route of ["/login", "/signup", "/forgot-password"]) {
                await anonymousPage.goto(route);
                await fits(anonymousPage);
            }
            await page.goto(`${list}/manage`);
            await page.getByRole("button", { name: "Löschen", exact: true }).click();
            const dialog = page.getByRole("dialog");
            await expect(dialog).toBeVisible();
            await fits(page);
            expect(await dialog.evaluate((el) => el.getBoundingClientRect().right)).toBeLessThanOrEqual(width);
            await page.keyboard.press("Escape");
            await expect(dialog).toBeHidden();
        });
    }
}

test("compound fields, upload, markdown and create-another preserve form data", async ({ page }) => {
    const list = await ownList(page);
    await page.goto(`${list}/create-item`);
    await ready(page);
    await page.locator("#name").fill("A long expressive wishlist item");
    await page.locator("#formatted-price").fill("19.95");
    await page.locator("#quantity").fill("3");
    await page.locator("#note").fill("**Keep this note**");
    await page.locator('input[type="file"][name="image"]').setInputFiles({
        name: "product.png",
        mimeType: "image/png",
        buffer: readFileSync(new URL("../fixtures/product.png", import.meta.url))
    });
    await expect(page.getByText("product.png", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    await expect(page.getByTestId("markdown-preview")).toContainText("Keep this note");
    const data = await page
        .locator("form[enctype]")
        .evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement)));
    expect(data.name).toBe("A long expressive wishlist item");
    expect(data.note).toBe("**Keep this note**");
    expect(data.price).toBe("19.95");
    expect(data.quantity).toBe("3");
    expect(data.lists).toBe(list.split("/").at(-1));
    await page.locator("#unlimited").check();
    await expect(page.locator("#quantity")).toBeDisabled();
    await page.getByRole("button", { name: "More create options" }).click();
    await page.getByRole("menuitem", { name: "Create and add another" }).click();
    await expect(page.locator("#name")).toHaveValue("");
    await expect(page).toHaveURL(new RegExp(`${list}/create-item`));
    await page.goto(list);
    await expect(page.getByTestId("item-card")).toContainText("A long expressive wishlist item");
});

test("list HCT palette survives create, edit, management and body portals then resets", async ({ page, baseURL }) => {
    const list = await ownList(page);
    const response = await page.request.post(`${list}/manage?/persist`, {
        form: { name: "Teal context", icon: "gift", iconColor: "#006a60", description: "Description for theme toggle" },
        headers: { Origin: baseURL! }
    });
    expect(response.ok()).toBeTruthy();
    await page.goto(list);
    const primary = () =>
        page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--md-primary"));
    const context = await primary();
    for (const mode of ["light", "dark"]) {
        await page.evaluate((mode) => localStorage.setItem("mode", JSON.stringify(mode)), mode);
        await page.reload();
        const toggle = page.getByRole("button", { name: "Hide description", exact: true });
        await expect(toggle).toBeVisible();
        expect(
            await toggle.evaluate((el) => {
                const probe = document.createElement("span");
                probe.style.color = "var(--md-primary)";
                el.append(probe);
                const matches = getComputedStyle(probe).color === getComputedStyle(el).color;
                probe.remove();
                return matches && el.getBoundingClientRect().height >= 48;
            })
        ).toBeTruthy();
    }
    await page.evaluate(() => localStorage.setItem("mode", JSON.stringify("light")));
    await page.reload();
    await page.request.post(`${list}/create-item`, {
        form: { name: "Palette edit", quantity: "1", lists: list.split("/").at(-1)! },
        headers: { Origin: baseURL! }
    });
    await page.goto(list);
    await page.getByTestId("item-card").getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page).toHaveURL(/\/items\/\d+\/edit/);
    expect(await primary()).toBe(context);

    for (const route of [`${list}/create-item`, `${list}/manage`]) {
        await page.goto(route);
        expect(await primary()).toBe(context);
    }
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => getComputedStyle(el).getPropertyValue("--md-primary"))).toBe(context);
    await page.keyboard.press("Escape");
    await page.goto("/account");
    expect(await primary()).not.toBe(context);
    await page.goto(`/lists/create?color=%23ff0000`);
    expect(await primary()).not.toBe(context);
});

test("tile default, row image geometry, filled tile images, long titles, keyboard and reduced motion", async ({
    page
}) => {
    const list = await ownList(page);
    await page.goto(`${list}/create-item`);
    const title = "Langer deutscher Produktname mit vielen Einzelheiten und zusätzlichen Größenangaben";
    await page.locator("#name").fill(title);
    await page.locator('input[type="file"][name="image"]').setInputFiles({
        name: "product.png",
        mimeType: "image/png",
        buffer: readFileSync(new URL("../fixtures/product.png", import.meta.url))
    });
    await page.locator("#note").fill("Lesbare Notizen unter dem Titel");
    await page.locator("#submit").click();
    await page.waitForURL((url) => !url.pathname.endsWith("/create-item"));
    await page.goto(list);
    await expect(page.getByTestId("item-card")).toBeVisible();
    await ready(page);
    const card = page.getByTestId("item-card");
    await expect(card.locator(".m3-tile-media")).toBeVisible();
    await page.getByTitle("List View", { exact: true }).click();
    await page.reload();
    await expect(card.locator(".m3-item-row")).toBeVisible();
    const dimensions = await card.evaluate((el) => {
        const row = el.querySelector(".m3-item-row")!.getBoundingClientRect();
        const media = el.querySelector(".m3-item-media")!.getBoundingClientRect();
        return {
            ratio: media.width / row.width,
            height: media.height,
            rowHeight: row.height,
            weight: getComputedStyle(el).fontWeight
        };
    });
    expect(dimensions.ratio).toBeCloseTo(1 / 3, 2);
    expect(dimensions.height).toBeCloseTo(dimensions.rowHeight, 0);
    expect(dimensions.rowHeight).toBeLessThan(350);
    expect(dimensions.weight).toBe("400");
    await card.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTitle("Tile View", { exact: true }).click();
    const tileImage = card.locator(".m3-tile-media img");
    await expect(tileImage).toBeVisible();
    expect(await tileImage.evaluate((el) => getComputedStyle(el).objectFit)).toBe("cover");
    expect(await tileImage.evaluate((el) => (el as HTMLImageElement).naturalHeight)).toBeGreaterThan(0);
    await tileImage.evaluate(
        (el) => ((el as HTMLImageElement).src = "/api/assets/intentionally-missing-test-image.webp")
    );
    await expect(card.getByRole("img", { name: "default item image" })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 900 });
    await page.getByTitle("List View", { exact: true }).click();
    await page.getByRole("button", { name: "Reorder", exact: true }).click();
    await fits(page);
    const reorder = card.locator(".m3-reorder-actions");
    expect(await reorder.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy();
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await card.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0s/);
});

test("grouped error contour belongs to shell and password visibility is keyboard accessible", async ({
    anonymousPage: page
}) => {
    await page.goto("/login");
    await page.locator("#username").fill("does-not-exist");
    await page.locator("#password").fill("incorrect-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator("#password")).toHaveAttribute("aria-invalid", "true");
    const inputStyle = await page
        .locator("#password")
        .evaluate((el) => ({ border: getComputedStyle(el).borderWidth, shadow: getComputedStyle(el).boxShadow }));
    expect(inputStyle).toEqual({ border: "0px", shadow: "none" });
    const toggle = page.getByRole("button", { name: "toggle password visibility" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#password")).toHaveAttribute("type", "text");
});

test("URL import and keyboard refresh retain the product API contract", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/product?*", async (route) => {
        requestCount += 1;
        await route.fulfill({
            json: {
                url: "https://example.test/product",
                title: `Imported product ${requestCount}`,
                price: 12.5,
                currency: "EUR"
            }
        });
    });
    const list = await ownList(page);
    await page.goto(`${list}/create-item`);
    await page.locator("#url").fill("https://example.test/product");
    await page.locator("#name").focus();
    await expect(page.locator("#name")).toHaveValue("Imported product 1");
    await page.locator("#refresh-item").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#name")).toHaveValue("Imported product 2");
    await expect(page.locator('input[name="price"][type="hidden"]')).toHaveValue("12.5");
    await page.locator("#reset-field").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#url")).toHaveValue("");
});

test("shared compound fields support RTL at 320px", async ({ page }) => {
    const list = await ownList(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`${list}/create-item`);
    await ready(page);
    await page.evaluate(() => (document.documentElement.dir = "rtl"));
    await fits(page);
    const geometry = await page.locator("#url").evaluate((input) => ({
        inputEnd: input.getBoundingClientRect().right,
        iconStart: input.parentElement!.querySelector(".m3-field-slot")!.getBoundingClientRect().left
    }));
    expect(geometry.iconStart).toBeGreaterThanOrEqual(geometry.inputEnd - 1);
});

test("reservation quantity dialog fits 320px in both themes", async ({ page, additionalPage, baseURL }) => {
    const list = await ownList(page);
    await page.request.post(`${list}/create-item`, {
        form: { name: "Reservation dialog", quantity: "3", lists: list.split("/").at(-1)! },
        headers: { Origin: baseURL! }
    });
    await additionalPage.setViewportSize({ width: 320, height: 900 });
    for (const mode of ["light", "dark"]) {
        await additionalPage.addInitScript((mode) => localStorage.setItem("mode", JSON.stringify(mode)), mode);
        await additionalPage.goto(list);
        await ready(additionalPage);
        await additionalPage.getByTestId("item-card").getByRole("button", { name: "Claim", exact: true }).click();
        const dialog = additionalPage.getByRole("dialog");
        await expect(dialog.getByRole("spinbutton")).toBeVisible();
        await fits(additionalPage);
        expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy();
        await additionalPage.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
    }
});

test("create-another removes imported product URL without importing again", async ({ page }) => {
    let imports = 0;
    await page.route("**/api/product?*", async (route) => {
        imports += 1;
        await route.fulfill({
            json: { url: "https://example.test/gift", title: "Imported gift", price: 9, currency: "EUR" }
        });
    });
    const list = await ownList(page);
    await page.goto(`${list}/create-item?productUrl=${encodeURIComponent("https://example.test/gift")}`);
    await expect(page.locator("#name")).toHaveValue("Imported gift");
    await page.getByRole("button", { name: "More create options" }).click();
    await page.getByRole("menuitem", { name: "Create and add another" }).click();
    await expect(page.locator("#name")).toHaveValue("");
    await expect(page.locator("#url")).toHaveValue("");
    await expect(page).not.toHaveURL(/productUrl=/);
    expect(imports).toBe(1);
    await page.goto(list);
    await expect(page.getByTestId("item-card")).toContainText("Imported gift");
});
