import { test, expect } from "../fixtures";
import { GroupSettingsPage } from "../pageObjects/group-settings.page";
import type { Page } from "@playwright/test";

async function expectToastAtBottom(page: Page) {
    const toast = page.locator('[data-scope="toast"][data-part="root"][data-state="open"]');
    await expect(toast).toBeVisible();
    await expect
        .poll(async () => {
            const bounds = (await toast.boundingBox())!;
            const footer = await page.locator(".m3-navigation-footer").boundingBox();
            const fabLocator = page.locator(".m3-page-fab:visible");
            const fab = (await fabLocator.count()) ? await fabLocator.boundingBox() : null;
            let edge = footer?.height ? footer.y : page.viewportSize()!.height;
            if (fab && bounds.x < fab.x + fab.width + 16 && bounds.x + bounds.width > fab.x - 16) {
                edge = Math.min(edge, fab.y);
            }
            return Math.abs(edge - bounds.y - bounds.height - 16);
        })
        .toBeLessThan(1);
    await toast.hover();
}

for (const suggestions of [false, true]) {
    test(`reservation feedback stays near the bottom with suggestions ${suggestions}`, async ({
        page: owner,
        userData,
        additionalPage: claimer,
        baseURL
    }) => {
        test.setTimeout(90000);
        const settings = new GroupSettingsPage(owner, userData.groups[0]);
        await settings.goto();
        await settings.clickSettingsTab();
        const suggestionsSettings = await settings.getSuggestionsSettings();
        if (suggestions) await suggestionsSettings.enable();
        else await suggestionsSettings.disable();
        await settings.saveSettings();

        await owner.goto("/lists");
        const list = (await owner.getByTestId("list-card").first().getAttribute("href"))!;
        const response = await owner.request.post(`${list}/create-item`, {
            form: { name: "Toast placement", quantity: "1", lists: list.split("/").at(-1)! },
            headers: { Origin: baseURL! }
        });
        expect(response.ok()).toBeTruthy();
        await claimer.goto(list);
        await expect(claimer.locator(".m3-page-fab")).toHaveCount(suggestions ? 1 : 0);
        await claimer.getByTestId("item-card").getByRole("button", { name: "Claim", exact: true }).click();
        await expectToastAtBottom(claimer);

        // Resize while the same notification is visible, including a short landscape viewport.
        for (const viewport of [
            { width: 390, height: 720 },
            { width: 768, height: 480 },
            { width: 1440, height: 900 },
            { width: 390, height: 720 }
        ]) {
            await claimer.setViewportSize(viewport);
            await expectToastAtBottom(claimer);
            if (viewport.width === 768) {
                const toastBounds = (await claimer.locator('[data-scope="toast"][data-part="root"]').boundingBox())!;
                const footerBounds = (await claimer.locator(".m3-navigation-footer").boundingBox())!;
                expect(toastBounds.y + toastBounds.height).toBeCloseTo(footerBounds.y - 16, 0);
            }
            if (viewport.width === 1440 || viewport.width === 768) {
                await test.info().attach(`reservation-${viewport.width}px`, {
                    body: await claimer.screenshot(),
                    contentType: "image/png"
                });
            }
        }
        const toast = claimer.locator('[data-scope="toast"][data-part="root"][data-state="open"]');
        await toast.getByRole("button", { name: "Dismiss notification" }).click();
        await claimer.getByRole("button", { name: "Unclaim", exact: true }).click();
        await expectToastAtBottom(claimer);

        // A quantity reservation goes through a dialog before showing the same feedback.
        const update = await owner.request.post(`${list}/create-item`, {
            form: { name: "Quantity reservation", quantity: "3", lists: list.split("/").at(-1)! },
            headers: { Origin: baseURL! }
        });
        expect(update.ok()).toBeTruthy();
        await claimer.reload();
        const item = claimer.getByTestId("item-card").filter({ hasText: "Quantity reservation" });
        await item.getByRole("button", { name: "Claim", exact: true }).click();
        const dialog = claimer.getByRole("dialog");
        await expect(dialog.getByRole("spinbutton")).toBeVisible();
        await dialog.getByRole("button", { name: "Claim", exact: true }).click();
        await expect(dialog).toBeHidden();
        await expectToastAtBottom(claimer);
    });
}
