import { test, expect } from "../fixtures";
import { ListsPage } from "../pageObjects/lists.page";

for (const width of [390, 1440]) {
    test(`share an existing list, reserve across groups and revoke access at ${width}px`, async ({
        userFactory,
        baseURL
    }) => {
        test.setTimeout(60000);
        const owner = await userFactory.createUserPage();
        const family = await userFactory.createUserPage({ group: owner.user.groups[0] });
        const friends = await userFactory.createUserPage();
        const outsider = await userFactory.createUserPage();
        const admin = await userFactory.getAdminPage();
        const groupA = owner.user.groups[0];
        const groupB = friends.user.groups[0];
        expect(
            (
                await admin.request.put(`/api/groups/${groupB.id}/users/${owner.user.id}`, { data: { manager: false } })
            ).ok()
        ).toBeTruthy();
        await owner.page.setViewportSize({ width, height: 900 });
        const overview = new ListsPage(owner.page);
        await owner.page.goto(`/lists?groups=${groupA.id}`);
        const list = await (await overview.getListByName(`${owner.user.name}'s Wishes`)).click();
        const listId = list.getId();
        const wish = await list.createItem();
        await (await wish.getForm()).fillName("Shared birthday present");
        await (await wish.getForm()).fillQuantity(1);
        await wish.create();
        await owner.page.goto(`/lists/${listId}`);
        const itemCard = owner.page.getByTestId("item-card").filter({ hasText: "Shared birthday present" });
        const labelId = await itemCard.getAttribute("aria-labelledby");
        expect(labelId).toBeTruthy();
        // The drawer URL is the public UI's item identifier.
        await itemCard.click();
        await expect(owner.page).toHaveURL(/item-id=/);
        const itemId = new URL(owner.page.url()).searchParams.get("item-id");
        expect(itemId).toBeTruthy();

        expect((await friends.page.request.get(`/lists/${listId}`)).status()).toBe(404);
        await owner.page.goto(`/lists/${listId}/manage`);
        await owner.page.getByRole("button", { name: /Select groups/ }).click();
        await expect(owner.page.getByRole("checkbox", { name: groupA.name, exact: true })).toBeChecked();
        await owner.page.getByRole("checkbox", { name: groupB.name, exact: true }).check();
        await owner.page.screenshot({ path: `test-results/multi-group-picker-${width}.png`, fullPage: true });
        expect(await owner.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await owner.page.keyboard.press("Escape");
        await owner.page.getByRole("button", { name: "Save", exact: true }).click();
        await expect(owner.page).toHaveURL(`/lists/${listId}`);

        await friends.page.goto(`/lists/${listId}`);
        await expect(
            friends.page.getByTestId("item-card").filter({ hasText: "Shared birthday present" })
        ).toBeVisible();
        await friends.page.goto("/lists");
        await expect(friends.page.locator(`a[href="/lists/${listId}"]`)).toBeVisible();
        expect((await outsider.page.request.get(`/lists/${listId}`)).status()).toBe(404);

        const claimUrl = `/api/lists/${listId}/items/${itemId}/claims`;
        const competing = await Promise.all([
            family.page.request.put(claimUrl, { data: { quantity: 1, claimedById: family.user.id } }),
            friends.page.request.put(claimUrl, { data: { quantity: 1, claimedById: friends.user.id } })
        ]);
        expect(competing.filter((response) => response.ok())).toHaveLength(1);
        const ownerHtml = await (await owner.page.request.get(`/lists/${listId}`)).text();
        expect(ownerHtml).not.toContain(family.user.name);
        expect(ownerHtml).not.toContain(friends.user.name);
        const duplicate = await friends.page.request.put(claimUrl, {
            data: { quantity: 1, claimedById: friends.user.id }
        });
        expect(duplicate.status()).toBe(422);

        // Only the owner can change these shares; empty and foreign groups fail.
        const action = `/lists/${listId}/manage?/persist`;
        const headers = { Origin: baseURL!, Accept: "application/json" };
        const invalid = await owner.page.request.post(action, {
            headers,
            form: { name: "Birthday", groups: outsider.user.groups[0].id }
        });
        expect((await invalid.json()).status).toBe(403);
        const forbidden = await friends.page.request.post(action, {
            headers,
            form: { name: "Birthday", groups: groupB.id }
        });
        expect(forbidden.status()).toBe(403);

        for (const participant of [family, friends]) {
            await participant.page.goto(`/lists/${listId}`);
            await participant.page.evaluate((id) => {
                const state = window as unknown as { sharedListEvents: unknown[]; sharedListSource: EventSource };
                state.sharedListEvents = [];
                state.sharedListSource = new EventSource(`/lists/${id}/events`);
                state.sharedListSource.addEventListener("item_create", (event) =>
                    state.sharedListEvents.push(JSON.parse(event.data))
                );
            }, listId);
        }
        const firstLiveWish = await list.createItem();
        await (await firstLiveWish.getForm()).fillName("Live before revocation");
        await firstLiveWish.create();
        for (const participant of [family, friends]) {
            await expect
                .poll(() =>
                    participant.page.evaluate(
                        () => (window as unknown as { sharedListEvents: unknown[] }).sharedListEvents.length
                    )
                )
                .toBe(1);
        }
        const liveItemId = await family.page.evaluate(
            () => (window as unknown as { sharedListEvents: { id: number }[] }).sharedListEvents[0].id
        );
        expect(
            (
                await family.page.request.put(`/api/lists/${listId}/items/${liveItemId}/claims`, {
                    data: { quantity: 1, claimedById: family.user.id }
                })
            ).ok()
        ).toBeTruthy();

        await owner.page.goto(`/lists/${listId}/manage`);
        await owner.page.getByRole("button", { name: /Select groups/ }).click();
        await expect(owner.page.getByRole("checkbox", { name: groupB.name, exact: true })).toBeChecked();
        await owner.page.getByRole("checkbox", { name: groupA.name, exact: true }).uncheck();
        await owner.page.keyboard.press("Escape");
        await owner.page.getByRole("button", { name: "Save", exact: true }).click();
        await expect(owner.page).toHaveURL(`/lists/${listId}`);
        expect((await family.page.request.get(`/lists/${listId}`)).status()).toBe(404);
        expect((await friends.page.request.get(`/lists/${listId}`)).ok()).toBeTruthy();
        // Owner is still using group A, and retains access and management.
        expect((await owner.page.request.get(`/lists/${listId}/manage`)).ok()).toBeTruthy();
        const secondLiveWish = await list.createItem();
        await (await secondLiveWish.getForm()).fillName("Live after revocation");
        await secondLiveWish.create();
        await expect
            .poll(() =>
                friends.page.evaluate(
                    () => (window as unknown as { sharedListEvents: unknown[] }).sharedListEvents.length
                )
            )
            .toBe(2);
        expect(
            await family.page.evaluate(
                () => (window as unknown as { sharedListEvents: unknown[] }).sharedListEvents.length
            )
        ).toBe(1);
        await family.page.goto("/claims");
        const retainedClaim = family.page.getByTestId("item-card").filter({ hasText: "Live before revocation" });
        await expect(retainedClaim).toBeVisible();
        await retainedClaim.getByRole("button", { name: "Unclaim", exact: true }).click();
        await expect(retainedClaim).toHaveCount(0);
        await owner.page.screenshot({ path: `test-results/multi-group-owner-${width}.png`, fullPage: true });
    });
}

test("overview defaults to all memberships, filters groups and keeps My Lists complete", async ({ userFactory }) => {
    const owner = await userFactory.createUserPage();
    const second = await userFactory.createUserPage();
    const admin = await userFactory.getAdminPage();
    const groupA = owner.user.groups[0];
    const groupB = second.user.groups[0];
    expect(
        (await admin.request.put(`/api/groups/${groupB.id}/users/${owner.user.id}`, { data: { manager: false } })).ok()
    ).toBeTruthy();
    const peer = await userFactory.createUserPage({ group: groupA });
    await owner.page.goto("/lists");
    await expect(owner.page.getByTestId("list-card").filter({ hasText: peer.user.name })).toBeVisible();
    await expect(owner.page.getByTestId("list-card").filter({ hasText: second.user.name })).toBeVisible();
    await expect(owner.page.getByTestId("overview-group-filter")).toBeVisible();
    await owner.page.getByTestId("overview-group-filter").getByRole("button").first().click();
    await owner.page.getByRole("checkbox", { name: groupB.name, exact: true }).check();
    await owner.page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(owner.page).toHaveURL(new RegExp(`groups=${groupB.id}`));
    await expect(owner.page.getByTestId("list-card").filter({ hasText: peer.user.name })).toHaveCount(0);
    await owner.page.screenshot({ path: "test-results/overview-groups-filter.png", fullPage: true });
    await owner.page.goto(`/lists?groups=${groupA.id}`);
    await expect(owner.page.getByTestId("list-card").filter({ hasText: peer.user.name })).toBeVisible();
    await expect(owner.page.getByTestId("list-card").filter({ hasText: second.user.name })).toHaveCount(0);
    await owner.page.goto(`/lists?groups=${groupB.id}`);
    await expect(owner.page.getByTestId("list-card").filter({ hasText: second.user.name })).toBeVisible();
    const membership = await (await admin.request.get(`/api/groups/${groupA.id}/users/${owner.user.id}`)).json();
    expect(membership.membership.active).toBe(true);
    const list = await (await new ListsPage(owner.page).getListByName(`${second.user.name}'s Wishes`)).click();
    await expect(owner.page).toHaveURL(`/lists/${list.getId()}`);
    await owner.page.goto(`/lists?users=${owner.user.id}&groups=not-a-member`);
    await expect(owner.page.getByTestId("list-card")).toHaveCount(2);
    await expect(owner.page.getByTestId("overview-group-filter")).toHaveCount(0);
    await owner.page.goto("/lists?groups=not-a-member");
    await expect(owner.page.getByTestId("list-card")).toHaveCount(0);

    await owner.page.goto("/lists/create");
    await owner.page.getByLabel("Name", { exact: true }).fill("Shared at creation");
    await owner.page.getByRole("button", { name: /Select groups/ }).click();
    await owner.page.getByRole("checkbox", { name: groupA.name, exact: true }).check();
    await owner.page.getByRole("checkbox", { name: groupB.name, exact: true }).check();
    await owner.page.keyboard.press("Escape");
    await owner.page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(owner.page.getByRole("heading", { name: "Shared at creation", exact: true })).toBeVisible();
    const newListId = new URL(owner.page.url()).pathname.split("/").at(-1);
    expect((await second.page.request.get(`/lists/${newListId}`)).ok()).toBeTruthy();
    expect((await peer.page.request.get(`/lists/${newListId}`)).ok()).toBeTruthy();
});
