import { test, expect } from "../fixtures";
import { ListPage } from "../pageObjects/list.page";

for (const width of [390, 1440]) {
    test(`public registry without groups uses manager rights at ${width}px`, async ({
        userFactory,
        anonymousPage,
        baseURL
    }) => {
        test.setTimeout(90000);
        const groupOwner = await userFactory.createUserPage();
        const creator = await userFactory.createUserPage({ group: groupOwner.user.groups[0] });
        const successor = await userFactory.createUserPage();
        const outsider = await userFactory.createUserPage();
        const admin = await userFactory.getAdminPage();
        await admin.request.patch(`/api/groups/${groupOwner.user.groups[0].id}/users/${creator.user.id}`, {
            data: { manager: false }
        });
        const headers = { Origin: baseURL!, Accept: "application/json" };
        const leave = await creator.page.request.post("/account/groups?/leave", {
            headers,
            form: { groupId: groupOwner.user.groups[0].id }
        });
        expect((await leave.json()).type).toBe("redirect");
        await creator.page.setViewportSize({ width, height: 900 });
        await creator.page.goto("/lists/create");
        await creator.page.getByLabel("List type").selectOption("registry");
        await creator.page.getByLabel("Name", { exact: true }).fill("Celebration registry");
        await expect(creator.page.getByRole("button", { name: /Select groups/ })).toHaveCount(0);
        await creator.page.getByRole("button", { name: "Create", exact: true }).click();
        await expect(creator.page).toHaveURL(/\/lists\/(?!create$)[^/]+$/);
        const listId = new URL(creator.page.url()).pathname.split("/")[2];
        const listUrl = `/lists/${listId}`;
        const metadata = await creator.page.request.patch(`/api/lists/${listId}`, { data: { public: true } });
        expect(metadata.ok()).toBeTruthy();
        expect(await metadata.json()).toMatchObject({
            ownerId: null,
            listMode: "registry",
            groupId: "global",
            public: true
        });
        await creator.page.goto(`/lists?users=${creator.user.id}`);
        await expect(creator.page.locator(`a[href="${listUrl}"]`)).toHaveCount(1);
        await creator.page.goto(`/lists?groups=${groupOwner.user.groups[0].id}`);
        await expect(creator.page.locator(`a[href="${listUrl}"]`)).toHaveCount(0);
        await anonymousPage.goto(listUrl);
        await expect(anonymousPage.getByRole("heading", { name: "Celebration registry", exact: true })).toBeVisible();
        expect((await outsider.page.request.get(`${listUrl}/manage`)).status()).toBe(403);
        expect((await outsider.page.request.get(`${listUrl}/create-item`)).status()).toBe(401);
        await creator.page.goto(listUrl);
        const listPage = new ListPage(creator.page, { name: "Celebration registry" });
        const itemForm = await listPage.createItem();
        await (await itemForm.getForm()).fillName("Shared celebration gift");
        await (await itemForm.getForm()).fillQuantity(2);
        await itemForm.create();
        await creator.page.goto(listUrl);
        await creator.page.getByTestId("item-card").filter({ hasText: "Shared celebration gift" }).click();
        const itemId = new URL(creator.page.url()).searchParams.get("item-id");
        expect(itemId).toBeTruthy();
        const claim = await outsider.page.request.put(`/api/lists/${listId}/items/${itemId}/claims`, {
            data: { quantity: 1, claimedById: outsider.user.id }
        });
        expect(claim.ok()).toBeTruthy();
        const publicUser = await anonymousPage.request.post("/api/users/public", {
            data: { username: "guest@example.test", name: "Guest", groupId: "global" }
        });
        expect(publicUser.ok()).toBeTruthy();
        const guestClaim = await anonymousPage.request.put(`/api/lists/${listId}/items/${itemId}/claims`, {
            data: { quantity: 1, publicClaimedById: (await publicUser.json()).id }
        });
        expect(guestClaim.ok()).toBeTruthy();
        await creator.page.goto(`${listUrl}/manage`);
        await expect(creator.page.getByLabel("List type")).toBeDisabled();
        await creator.page.getByRole("button", { name: "Add manager", exact: true }).click();
        const dialog = creator.page.getByRole("dialog");
        await dialog.getByRole("searchbox").fill(successor.user.username);
        await dialog.getByRole("option").filter({ hasText: successor.user.name }).click();
        await dialog.getByRole("button", { name: "Add manager", exact: true }).click();
        await creator.page.getByRole("button", { name: "Save", exact: true }).click();
        await expect(creator.page).toHaveURL(listUrl);
        expect((await successor.page.request.get(`${listUrl}/manage`)).ok()).toBeTruthy();
        const lookup = await creator.page.request.get(`/api/users?registryManagers=1&name=${successor.user.username}`);
        const matches = await lookup.json();
        expect(matches).toHaveLength(1);
        expect(matches[0]).not.toHaveProperty("email");
        const persist = `${listUrl}/manage?/persist`;
        const empty = await creator.page.request.post(persist, { headers, form: { name: "Celebration registry" } });
        expect((await empty.json()).status).toBe(422);
        const grouped = await creator.page.request.post(persist, {
            headers,
            form: { name: "Celebration registry", managers: successor.user.id, groups: successor.user.groups[0].id }
        });
        expect((await grouped.json()).status).toBe(422);
        const typeChange = await creator.page.request.post(persist, {
            headers,
            form: { name: "Celebration registry", listMode: "standard", managers: successor.user.id }
        });
        expect((await typeChange.json()).status).toBe(422);
        const privateAttempt = await creator.page.request.patch(`/api/lists/${listId}`, { data: { public: false } });
        expect(privateAttempt.status()).toBe(422);
        const transfer = await creator.page.request.post(persist, {
            headers,
            form: { name: "Celebration registry", listMode: "registry", managers: successor.user.id }
        });
        expect((await transfer.json()).type).toBe("redirect");
        expect((await creator.page.request.get(`${listUrl}/manage`)).status()).toBe(403);
        expect((await creator.page.request.get(`/items/${itemId}/edit`)).status()).toBe(403);
        expect((await creator.page.request.delete(`/api/items/${itemId}`)).status()).toBe(403);
        expect((await creator.page.request.delete(`/api/lists/${listId}/items/${itemId}`)).status()).toBe(401);
        await creator.page.goto(`/lists?users=${creator.user.id}`);
        await expect(creator.page.locator(`a[href="${listUrl}"]`)).toHaveCount(0);
        await successor.page.setViewportSize({ width, height: 900 });
        await successor.page.goto(`${listUrl}/manage`);
        await expect(successor.page.getByRole("button", { name: `Remove ${successor.user.name}` })).toBeDisabled();
        expect(await successor.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await successor.page.screenshot({ path: `test-results/registry-manage-${width}.png`, fullPage: true });
        expect((await successor.page.request.get(`/items/${itemId}/edit`)).ok()).toBeTruthy();
        await successor.page.goto(`/items/${itemId}/edit?redirectTo=${listUrl}`);
        await successor.page.getByLabel("Item Name").fill("Shared celebration gift updated");
        await successor.page.getByRole("button", { name: "Save", exact: true }).click();
        await expect(successor.page).toHaveURL(listUrl);
        await expect(
            successor.page.getByTestId("item-card").filter({ hasText: "Shared celebration gift updated" })
        ).toBeVisible();
        expect((await admin.request.delete(`/api/users/${successor.user.id}`)).status()).toBe(409);
        expect((await admin.request.delete(`/api/users/${creator.user.id}`)).ok()).toBeTruthy();
        expect((await successor.page.request.get(`/items/${itemId}/edit`)).ok()).toBeTruthy();
        await anonymousPage.goto(listUrl);
        await expect(
            anonymousPage.getByTestId("item-card").filter({ hasText: "Shared celebration gift" })
        ).toBeVisible();
    });
}
