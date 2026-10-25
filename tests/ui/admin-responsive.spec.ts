import { test, expect } from "../fixtures";
import type { Page } from "@playwright/test";

async function fits(page: Page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    for (const selector of ["html", "#main", ".admin-panel"]) {
        if ((await page.locator(selector).count()) === 0) continue;
        const overflow = await page.locator(selector).evaluate((element) => element.scrollWidth - element.clientWidth);
        expect(overflow, `${selector} must not scroll horizontally`).toBeLessThanOrEqual(1);
    }
}

async function navigate(page: Page, value: string, label: string) {
    const compact = page.locator(".admin-mobile-navigation select");
    if (await compact.isVisible()) await compact.selectOption(value);
    else await page.getByRole("tab", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/${value}`));
}

for (const width of [320, 390, 768, 1440]) {
    for (const mode of ["light", "dark"]) {
        test(`German admin navigation, records and settings at ${width}px ${mode}`, async ({
            adminPage: page,
            userData
        }, testInfo) => {
            test.setTimeout(120000);
            await page.setViewportSize({ width, height: 900 });
            await page.context().setExtraHTTPHeaders({ "Accept-Language": "de-DE" });
            await page.addInitScript((mode) => {
                localStorage.setItem("mode", JSON.stringify(mode));
                Object.defineProperty(navigator, "languages", { get: () => ["de-DE"] });
            }, mode);
            const groupName = `Familiengeburtstage und gemeinsame Geschenkplanung ${userData.username}`;
            expect(
                (await page.request.patch(`/api/groups/${userData.groups[0].id}`, { data: { name: groupName } })).ok()
            ).toBeTruthy();
            await page.goto("/admin/users");
            const compact = await page.locator(".admin-mobile-navigation select").isVisible();
            await expect(page.locator(compact ? ".admin-mobile-records" : ".admin-desktop-table")).toBeVisible();
            await expect(page.locator(compact ? ".admin-desktop-table" : ".admin-mobile-records")).toBeHidden();
            await page.getByRole("searchbox").fill(userData.email);
            const user = page.locator(`a[href="/admin/users/${userData.id}"]:visible`);
            await expect(user).toContainText(userData.name);
            await page.getByRole("button", { name: "Benutzer einladen", exact: true }).click();
            const invitation = page.getByRole("dialog");
            await invitation.getByRole("option", { name: groupName, exact: true }).click();
            await invitation.getByRole("button", { name: "Einladen", exact: true }).click();
            await expect(page.getByRole("link", { name: "Einladungslink", exact: true })).toBeVisible();
            await fits(page);
            await page.screenshot({ path: testInfo.outputPath("users.png") });
            await user.click();
            await expect(page.getByRole("textbox", { name: "Benutzername", exact: true })).toHaveValue(
                userData.username
            );
            await fits(page);
            await page.goto("/admin/users");
            await page.getByRole("searchbox").fill("no-matching-account-0000000000");
            await expect(page.getByRole("status").filter({ hasText: "Keine Ergebnisse" })).toBeVisible();

            await navigate(page, "groups", "Gruppen");
            await page.getByRole("searchbox").fill(userData.username);
            await fits(page);
            await page.locator(`a[href="/admin/groups/${userData.groups[0].id}"]:visible`).click();
            await expect(page.getByRole("heading", { name: groupName, exact: true })).toBeVisible();
            await fits(page);
            await page.screenshot({ path: testInfo.outputPath("members.png") });
            const member = page
                .locator(compact ? ".admin-mobile-records > li" : "tbody > tr")
                .filter({ hasText: userData.username });
            const manager = member.getByRole("button", { name: `Leiter: ${userData.name}`, exact: true });
            await expect(manager).toHaveAttribute("aria-pressed", "true");
            await manager.click();
            const dialog = page.getByRole("dialog");
            await expect(dialog).toBeVisible();
            await dialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
            await expect(manager).toHaveAttribute("aria-pressed", "true");
            await page.getByRole("tab", { name: "Einstellungen", exact: true }).click();
            await expect(page).toHaveURL(/\/settings$/);
            await page.reload();
            await expect(page.getByRole("tab", { name: "Einstellungen", exact: true })).toHaveAttribute(
                "aria-selected",
                "true"
            );
            await fits(page);

            await page.goto("/admin/settings");
            const sections = page.getByRole("navigation", { name: "Einstellungen", exact: true });
            for (const [hash, label] of [
                ["#general", "Allgemein"],
                ["#email", "E-Mail"],
                ["#security", "Sicherheit"]
            ]) {
                await sections.getByRole("link", { name: label, exact: true }).click();
                await expect(page).toHaveURL(new RegExp(`${hash}$`));
                await expect(sections.getByRole("link", { name: label, exact: true })).toHaveAttribute(
                    "aria-current",
                    "page"
                );
                if (hash === "#email") await page.locator("#enableSMTP").check();
                if (hash === "#security") await page.locator("#enableOIDC").check();
                await fits(page);
                await page.screenshot({ path: testInfo.outputPath(`settings-${hash.slice(1)}.png`) });
            }
            await page.goto("/admin/settings#invalid");
            await expect(sections.getByRole("link", { name: "Allgemein", exact: true })).toHaveAttribute(
                "aria-current",
                "page"
            );
            await navigate(page, "actions", "Aktionen");
            await fits(page);
            await page.locator(".admin-danger-actions button").first().click();
            await expect(dialog).toBeVisible();
            await dialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
            await navigate(page, "about", "Über");
            await expect(page.getByRole("heading", { name: "Wishlist", exact: true })).toBeVisible();
            await fits(page);
        });
    }
}

test("compact member actions confirm role changes and removal", async ({
    adminPage: page,
    userData,
    additionalUserData
}) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(`/admin/groups/${userData.groups[0].id}/members`);
    const member = page.locator(".admin-mobile-records > li").filter({ hasText: additionalUserData.username });
    const manager = member.getByRole("button", { name: `Manager: ${additionalUserData.name}`, exact: true });
    await expect(manager).toHaveAttribute("aria-pressed", "true");
    await manager.click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(manager).toHaveAttribute("aria-pressed", "false");
    await manager.click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(manager).toHaveAttribute("aria-pressed", "true");
    const remove = member.getByRole("button", { name: `remove ${additionalUserData.name} from group`, exact: true });
    await remove.click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(member).toBeVisible();
    await remove.click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(member).toHaveCount(0);
    await fits(page);
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    const createList = page.locator("#enableDefaultListCreation");
    const nextValue = !(await createList.isChecked());
    await createList.setChecked(nextValue);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Settings saved successfully", { exact: false })).toBeVisible();
    await page.reload();
    await expect(createList).toBeChecked({ checked: nextValue });
});

test("compact settings recover from failed saving and SMTP dismissal never submits", async ({ adminPage: page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/admin/settings#email");
    let submissions = 0;
    page.on("request", (request) => {
        if (request.method() === "POST" && request.url().includes("/admin/settings")) submissions++;
    });
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
    await expect(page.getByRole("button", { name: "Dismiss", exact: true })).toBeHidden();
    expect(submissions).toBe(0);
    await page
        .getByRole("navigation", { name: "Settings", exact: true })
        .getByRole("link", { name: "General", exact: true })
        .click();
    await page.route(/\/admin\/settings\?\/settings$/, (route) =>
        route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ type: "error", status: 500, error: { message: "Test failure" } })
        })
    );
    const save = page.getByRole("button", { name: "Save", exact: true });
    const failedSave = page.waitForResponse((response) => response.url().endsWith("/admin/settings?/settings"));
    await save.click();
    expect((await failedSave).status()).toBe(500);
    await expect(page.getByRole("status").filter({ hasText: "Something went wrong" })).toBeVisible();
    await expect(save).toBeEnabled();
    await fits(page);
});
