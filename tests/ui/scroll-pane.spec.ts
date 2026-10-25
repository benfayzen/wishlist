import { test, expect } from "../fixtures";

for (const width of [320, 1440]) {
    test(`rounded pane stays fixed while scrolling at ${width}px`, async ({ page, baseURL }) => {
        await page.setViewportSize({ width, height: 720 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto("/lists");
        const list = (await page.getByTestId("list-card").first().getAttribute("href"))!;
        for (let index = 0; index < 8; index++) {
            const response = await page.request.post(`${list}/create-item`, {
                form: {
                    name: `Scroll example ${index + 1}`,
                    note: "Content for checking the persistent rounded viewport. ".repeat(4),
                    quantity: "1",
                    lists: list.split("/").at(-1)!
                },
                headers: { Origin: baseURL! }
            });
            expect(response.ok()).toBeTruthy();
        }
        for (const mode of ["light", "dark"]) {
            await page.evaluate((mode) => localStorage.setItem("mode", JSON.stringify(mode)), mode);
            await page.goto(list);
            await page.reload();
            const content = page.locator("#main");
            const pane = page.locator(".m3-content-pane");
            const before = (await pane.boundingBox())!;
            await content.focus();
            await page.keyboard.press("PageDown");
            await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
            await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
            await page.mouse.wheel(0, 300);
            await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(350);
            const after = (await pane.boundingBox())!;
            expect(after.y).toBe(before.y);
            expect(after.height).toBe(before.height);
            await expect(pane).toHaveCSS("border-top-left-radius", "28px");
            expect(await page.evaluate(() => window.scrollY)).toBe(0);
            expect(
                await pane.evaluate((el) => {
                    const box = el.getBoundingClientRect();
                    return el.contains(document.elementFromPoint(box.left + 1, box.top + 1));
                })
            ).toBeFalsy();
            expect(await content.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy();

            const last = page.getByTestId("item-card").last();
            await last.scrollIntoViewIfNeeded();
            const saved = await content.evaluate((el) => el.scrollTop);
            await last.click();
            await expect(page.getByRole("dialog")).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(page.getByRole("dialog")).toBeHidden();
            expect(await content.evaluate((el) => el.scrollTop)).toBeCloseTo(saved, 0);

            await page
                .getByRole("navigation", { name: "Main navigation" })
                .filter({ visible: true })
                .getByRole("link", { name: "Claims", exact: true })
                .click();
            await expect(page).toHaveURL(/\/claims$/);
            await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBe(0);
            await page.goBack();
            await expect(page).toHaveURL(new RegExp(`${list}$`));
            await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeCloseTo(saved, 0);
        }
        await page.emulateMedia({ media: "print" });
        await expect(page.locator("#main")).toHaveCSS("overflow-y", "visible");
        expect(await page.locator("#main").evaluate((el) => el.clientHeight >= el.scrollHeight - 1)).toBeTruthy();
        expect(errors).toEqual([]);
    });
}
