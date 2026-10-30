import { test, expect } from "../fixtures";
import { randomString } from "../util";

for (const width of [390, 1440]) {
    test(`ordinary users manage their own memberships without a group switcher at ${width}px`, async ({
        userFactory,
        baseURL
    }) => {
        test.setTimeout(60000);
        const owner = await userFactory.createUserPage();
        const member = await userFactory.createUserPage({ group: owner.user.groups[0] });
        const admin = await userFactory.getAdminPage();
        const group = owner.user.groups[0];
        expect(
            (
                await admin.request.patch(`/api/groups/${group.id}/users/${member.user.id}`, {
                    data: { manager: false }
                })
            ).ok()
        ).toBeTruthy();
        await member.page.setViewportSize({ width, height: 900 });
        await member.page.goto(`/lists?users=${member.user.id}`);
        const originalList = await member.page.getByTestId("list-card").first().getAttribute("href");
        await member.page.goto("/account");
        await member.page.getByRole("link", { name: "Groups", exact: true }).click();
        await expect(member.page).toHaveURL(/\/account\/groups$/);
        const membership = member.page
            .locator("section")
            .filter({ has: member.page.getByRole("heading", { name: group.name, exact: true }) });
        await expect(membership.getByRole("link", { name: "Manage Group", exact: true })).toHaveCount(0);
        expect((await member.page.request.get(`/admin/groups/${group.id}`)).status()).toBe(403);
        await membership.getByRole("button", { name: "Leave group", exact: true }).click();
        await member.page.getByRole("dialog").getByRole("button", { name: "Leave group", exact: true }).click();
        await expect(member.page.getByRole("heading", { name: group.name, exact: true })).toHaveCount(0);
        expect((await member.page.request.get(originalList!)).ok()).toBeTruthy();
        await member.page.goto(`/lists?users=${member.user.id}`);
        await expect(member.page.locator(`a[href="${originalList}"]`)).toBeVisible();
        await member.page.goto("/lists/create");
        await expect(member.page.getByLabel("List type")).toBeVisible();
        await member.page.getByRole("link", { name: "Create Group", exact: true }).click();
        await expect(member.page).toHaveURL(/\/account\/groups#create$/);
        const newName = `My group ${randomString()}`;
        await member.page.getByLabel("Group Name", { exact: true }).fill(newName);
        await member.page.getByRole("button", { name: "Create Group", exact: true }).click();
        await expect(member.page).toHaveURL(/\/admin\/groups\/[^/]+\/members$/);
        const newGroupId = new URL(member.page.url()).pathname.split("/")[3];
        expect((await member.page.request.get(`/admin/groups/${newGroupId}/settings`)).ok()).toBeTruthy();
        expect((await member.page.request.get("/admin")).status()).toBe(403);
        await member.page.goto("/items/import?url=https%3A%2F%2Fexample.invalid%2Fpresent");
        await expect(member.page.locator('select[name="group"]')).toHaveCount(0);
        await expect(
            member.page.locator(`select[name="list"] option[value="${originalList!.split("/").at(-1)}"]`)
        ).toHaveCount(1);
        const imported = await member.page.request.post("/items/import", {
            headers: { Origin: baseURL!, Accept: "text/html" },
            maxRedirects: 0,
            form: { list: originalList!.split("/").at(-1)!, url: "https://example.invalid/present" }
        });
        expect(imported.status()).toBe(303);
        expect(imported.headers().location).toContain(`${originalList}/create-item`);
        await member.page.goto("/account/groups");
        const ownGroup = member.page
            .locator("section")
            .filter({ has: member.page.getByRole("heading", { name: newName, exact: true }) });
        await expect(ownGroup.getByRole("link", { name: "Manage Group", exact: true })).toBeVisible();
        await expect(ownGroup.getByRole("button", { name: "Leave group", exact: true })).toBeDisabled();
        const unauthorized = await member.page.request.post("/account/groups?/leave", {
            headers: { Origin: baseURL!, Accept: "application/json" },
            form: { groupId: group.id }
        });
        expect((await unauthorized.json()).status).toBe(403);
        const lastManager = await member.page.request.post("/account/groups?/leave", {
            headers: { Origin: baseURL!, Accept: "application/json" },
            form: { groupId: newGroupId }
        });
        expect((await lastManager.json()).status).toBe(409);
        await member.page.goto("/lists");
        await member.page.getByRole("button", { name: "User Menu" }).click();
        await expect(member.page.getByRole("button", { name: "Change Group", exact: true })).toHaveCount(0);
        await expect(member.page.locator('[data-testid^="group-select"]')).toHaveCount(0);
        await member.page.keyboard.press("Escape");
        await member.page.goto("/account/groups");
        expect(await member.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await member.page.screenshot({ path: `test-results/own-groups-${width}.png`, fullPage: true });
        await member.page.goto(`/admin/groups/${newGroupId}/members`);
        await member.page.getByRole("button", { name: "Delete Group", exact: true }).click();
        await member.page
            .getByRole("dialog", { name: "Delete Group", exact: true })
            .getByRole("button", { name: "Confirm", exact: true })
            .click();
        await expect(member.page).toHaveURL(/\/account\/groups$/);
        expect((await member.page.request.get(originalList!)).ok()).toBeTruthy();
    });
}
