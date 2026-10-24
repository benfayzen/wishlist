import { test, expect } from "../fixtures";

for (const width of [320, 1440]) {
    for (const mode of ["light", "dark"]) {
        test(`admin clears sessions without deleting the user: ${width}px ${mode}`, async ({
            adminPage,
            page,
            anonymousPage: secondDevice,
            additionalPage,
            userData,
            baseURL
        }, testInfo) => {
            await secondDevice.request.post("/login", {
                form: { username: userData.username, password: userData.password },
                headers: { Origin: baseURL! }
            });
            await secondDevice.goto("/lists");
            await expect(secondDevice).toHaveURL(/\/lists$/);

            await adminPage.setViewportSize({ width, height: 900 });
            await adminPage.addInitScript((mode) => localStorage.setItem("mode", JSON.stringify(mode)), mode);
            await adminPage.goto(`/admin/users/${userData.id}`);
            const clearSessions = adminPage.getByRole("button", { name: "Clear user sessions", exact: true });
            await expect(clearSessions).toBeVisible();
            await adminPage.evaluate(async () => {
                await document.fonts.load('400 16px "Google Sans Flex"');
                await document.fonts.ready;
            });
            expect(await adminPage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
            await adminPage.screenshot({ path: testInfo.outputPath("admin-user.png"), fullPage: true });

            await clearSessions.click();
            const dialog = adminPage.getByRole("dialog");
            await expect(dialog).toContainText("The user will be logged out of all devices");
            await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
            await expect(dialog).toBeHidden();
            for (const device of [page, secondDevice]) {
                await device.goto("/lists");
                await expect(device).toHaveURL(/\/lists$/);
            }

            await clearSessions.click();
            await expect(dialog).toBeVisible();
            const bounds = await dialog.boundingBox();
            expect(bounds).not.toBeNull();
            expect(bounds!.x).toBeGreaterThanOrEqual(0);
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
            await adminPage.screenshot({ path: testInfo.outputPath("confirm-sessions.png"), fullPage: true });
            const submitted = adminPage.waitForResponse(
                (response) =>
                    response.request().method() === "POST" && new URL(response.url()).search === "?/clear-sessions"
            );
            await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
            expect((await submitted).ok()).toBeTruthy();
            await expect(adminPage.getByText("Cleared this user's sessions.", { exact: false })).toBeVisible();

            for (const device of [page, secondDevice]) {
                await device.goto("/lists");
                await expect(device).toHaveURL(/\/login(?:\?|$)/);
            }
            await additionalPage.goto("/lists");
            await expect(additionalPage).toHaveURL(/\/lists$/);
            await adminPage.reload();
            await expect(adminPage.getByRole("textbox", { name: "Username", exact: true })).toHaveValue(
                userData.username
            );

            await page.request.post("/login", {
                form: { username: userData.username, password: userData.password },
                headers: { Origin: baseURL! }
            });
            await page.goto("/lists");
            await expect(page).toHaveURL(/\/lists$/);
        });
    }
}

test("ordinary and anonymous users cannot clear another user's sessions", async ({
    page,
    anonymousPage,
    additionalPage,
    additionalUserData,
    baseURL
}) => {
    const action = `/admin/users/${additionalUserData.id}?/clear-sessions`;
    const forbidden = await page.request.post(action, { form: {}, headers: { Origin: baseURL! } });
    expect(forbidden.status()).toBe(403);
    const unauthenticated = await anonymousPage.request.post(action, {
        form: {},
        headers: { Origin: baseURL!, Accept: "text/html" },
        maxRedirects: 0
    });
    expect(unauthenticated.status()).toBe(307);
    await additionalPage.goto("/lists");
    await expect(additionalPage).toHaveURL(/\/lists$/);
});
