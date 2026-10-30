import { test, expect } from "../fixtures";

for (const width of [320, 1440]) {
    for (const mode of ["light", "dark"]) {
        test(`expressive filter selection and draft cancellation at ${width}px in ${mode}`, async ({
            page,
            additionalPage: _additionalPage,
            additionalUserData
        }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto("/lists");
            await page.evaluate((value) => (document.documentElement.dataset.mode = value), mode);
            const filter = page.getByTestId("list-filter").getByRole("button");
            await expect(filter).toHaveText(/People:\s*All/);
            await expect(filter).toHaveAccessibleName("People: All");
            await filter.click();
            const panel = page.locator(width < 600 ? ".m3-picker-sheet" : ".m3-picker-panel").filter({ visible: true });
            await expect(panel).toBeVisible();
            await panel.getByRole("checkbox", { name: additionalUserData.name, exact: true }).check();
            await panel.getByRole("button", { name: "Cancel", exact: true }).click();
            await expect(page).toHaveURL(/\/lists$/);
            await expect(filter).toBeFocused();
            await filter.click();
            await expect(panel.getByRole("checkbox", { name: additionalUserData.name, exact: true })).not.toBeChecked();
            await panel.getByRole("checkbox", { name: additionalUserData.name, exact: true }).check();
            await panel.getByRole("button", { name: "Apply", exact: true }).click();
            await expect(page).toHaveURL(new RegExp(`users=${additionalUserData.id}`));
            await expect(filter).toHaveAttribute("data-active", "true");
            await expect(filter).toHaveAccessibleName(`People: ${additionalUserData.name}`);
            await expect(filter).toContainText(additionalUserData.name);
            await page.reload();
            await filter.click();
            await expect(panel.getByRole("checkbox", { name: additionalUserData.name, exact: true })).toBeChecked();
            const geometry = await panel.boundingBox();
            expect(geometry!.x).toBeGreaterThanOrEqual(0);
            expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(width + 1);
            if (width < 600) {
                await expect(panel).toHaveAttribute("aria-modal", "true");
                const bar = await page.locator(".m3-navigation-bar").boundingBox();
                expect(geometry!.y + geometry!.height).toBeGreaterThan(bar!.y);
                await page.keyboard.press("Escape");
                await expect(panel).toBeHidden();
                await expect(filter).toBeFocused();
            }
        });
    }
}

test("sort direction restores from the URL, changes by keyboard and handles invalid filters", async ({ page }) => {
    await page.goto("/lists");
    const list = await page.getByTestId("list-card").first().getAttribute("href");
    await page.goto(`${list}?sort=price&dir=desc`);
    const sort = page.getByRole("button", { name: "Sort by: Price: High to Low", exact: true });
    await expect(sort).toBeVisible();
    await sort.click();
    const panel = page.locator(".m3-picker-panel");
    await expect(panel.getByRole("radio", { name: "Price: High to Low", exact: true })).toBeChecked();
    const ascending = panel.getByRole("radio", { name: "Price: Low to High", exact: true });
    await ascending.focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/dir=asc/);
    await page.reload();
    await expect(page.getByRole("button", { name: "Sort by: Price: Low to High", exact: true })).toBeVisible();
    await page.goto(`${list}?sort=%25broken&dir=desc`);
    await expect(page.getByRole("button", { name: "Sort by: Priority", exact: true })).toBeVisible();
});

test("failed product import releases the form for manual entry", async ({ page }) => {
    await page.goto("/lists");
    const list = await page.getByTestId("list-card").first().getAttribute("href");
    await page.route("**/api/product?*", (route) => route.abort("failed"));
    await page.goto(`${list}/create-item`);
    await page.locator("#url").fill("https://example.test/unavailable");
    await page.locator("#name").focus();
    await expect(page.locator("#name")).toBeEnabled();
    await expect(page.locator(".m3-inline-progress")).toBeHidden();
    await page.locator("#name").fill("Manually entered after failed import");
    await expect(page.locator("#name")).toHaveValue("Manually entered after failed import");
    await expect(page.getByRole("button", { name: "Create item", exact: true })).toBeEnabled();
});

test("claims grouping uses exclusive connected selection and fits a compact viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/claims");
    const group = page.getByRole("group", { name: "Group by", exact: true });
    const user = group.getByRole("button", { name: "User", exact: true });
    await user.focus();
    await page.keyboard.press("Space");
    await expect(user).toHaveAttribute("aria-pressed", "true");
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
    for (const button of await group.getByRole("button").all()) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("German grouping labels remain readable on a compact viewport", async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    const language = await page.request.post("/?/language", {
        form: { language: "de" },
        headers: { Origin: baseURL! }
    });
    expect(language.ok()).toBeTruthy();
    await page.goto("/claims");
    await expect(page.getByRole("button", { name: "Benutzer", exact: true })).toBeVisible();
    await expect(page.getByTestId("list-filter").getByRole("button")).toHaveAccessibleName("Personen: Alle");
    const filter = await page.locator(".claims-filter").boundingBox();
    const view = await page.locator(".claims-view").boundingBox();
    expect(Math.abs(filter!.y - view!.y)).toBeLessThanOrEqual(1);
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    const labels = page.locator(".m3-connected-group.has-labels .m3-connected-button-surface > span");
    for (const label of await labels.all()) {
        const geometry = await label.evaluate((el) => ({
            height: el.getBoundingClientRect().height,
            line: parseFloat(getComputedStyle(el).lineHeight)
        }));
        expect(geometry.height).toBeLessThanOrEqual(geometry.line + 1);
    }
    expect(await page.locator("#main").evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
});

test("split create action validates, keeps the submitter and clears after creating another", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/lists");
    const list = await page.getByTestId("list-card").first().getAttribute("href");
    await page.goto(`${list}/create-item`);
    const menu = page.getByRole("button", { name: "More create options", exact: true });
    await menu.focus();
    await page.keyboard.press("ArrowDown");
    await page.getByRole("menuitem", { name: "Create and add another", exact: true }).click();
    await expect(page.locator("#name")).toBeFocused();
    await expect(page).toHaveURL(/\/create-item$/);
    await page.locator("#name").fill("Split action keeps this wish");
    await menu.click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("#name")).toHaveValue("");
    await expect(page).toHaveURL(/\/create-item$/);
    await page.goto(list!);
    await expect(page.getByTestId("item-card")).toContainText("Split action keeps this wish");
});

test("loading uses a static silhouette with reduced motion", async ({ page }) => {
    await page.goto("/lists");
    const list = await page.getByTestId("list-card").first().getAttribute("href");
    let releaseProduct!: () => void;
    const productGate = new Promise<void>((resolve) => {
        releaseProduct = resolve;
    });
    await page.route("**/api/product?*", async (route) => {
        await productGate;
        await route.fulfill({ json: { title: "Imported with local progress", url: "https://example.test/gift" } });
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${list}/create-item`);
    await page.locator("#url").fill("https://example.test/gift");
    await page.locator("#name").focus();
    const status = page.getByRole("status").filter({ hasText: "Hang tight" });
    await expect(status).toBeVisible();
    await expect(status.locator(".m3-linear-progress > span")).toHaveCSS("animation-name", "none");
    await expect(page.locator("#name")).toBeVisible();
    releaseProduct();
    await expect(status).toBeHidden();
    await expect(page.locator("#name")).toHaveValue("Imported with local progress");
    let releaseSubmission!: () => void;
    const submissionGate = new Promise<void>((resolve) => {
        releaseSubmission = resolve;
    });
    await page.route("**/create-item", async (route) => {
        if (route.request().method() === "POST") await submissionGate;
        await route.continue();
    });
    const submit = page.getByRole("button", { name: "Create item", exact: true }).click();
    const loading = page.locator(".loading");
    await expect(loading).toBeVisible();
    await expect(loading).toHaveCSS("animation-name", "none");
    expect(await loading.evaluate((el) => getComputedStyle(el).maskImage)).toContain("data:image/svg+xml");
    releaseSubmission();
    await submit;
    await expect(page).not.toHaveURL(/\/create-item$/);
    await page.goto(list!);
    await expect(page.getByTestId("item-card")).toContainText("Imported with local progress");
});
