import { expect, test } from "../fixtures";
import { ListsPage } from "../pageObjects/lists.page";
import { randomString } from "../util";

test("create list with default values", async ({ page, userData }) => {
    const listsPage = new ListsPage(page);
    await listsPage.goto();
    const countBefore = await listsPage.getListCount();

    const createListPage = await listsPage.create();
    await createListPage.at();
    await createListPage.createDefault();

    await listsPage.goto();
    await listsPage.expectListCount(countBefore + 1);

    const listCount = await listsPage.getListCount();
    const newList = await listsPage.getListAt(listCount - 1);
    await newList.assertName(`${userData.name}'s Wishes`);
    await newList.assertOwner(userData.name);
});

test("create list with name", async ({ page, userData }) => {
    const listsPage = new ListsPage(page);
    await listsPage.goto();
    const countBefore = await listsPage.getListCount();

    const listName = randomString();
    const createListPage = await listsPage.create();
    await createListPage.at();
    await createListPage.create(listName);

    await listsPage.goto();
    await listsPage.expectListCount(countBefore + 1);

    const listCount = await listsPage.getListCount();
    const newList = await listsPage.getListAt(listCount - 1);
    await newList.assertName(listName);
    await newList.assertOwner(userData.name);
});

test("change list name", async ({ page }) => {
    const listsPage = new ListsPage(page);
    await listsPage.goto();

    const listCount = await listsPage.getListCount();
    const list = await listsPage.getListAt(0);

    const manageListPage = await list.click().then((list) => list.manage());
    await manageListPage.at();
    const newListName = randomString();
    await manageListPage.setName(newListName).then((p) => p.save());

    await listsPage.goto();
    expect(await listsPage.getListCount()).toEqual(listCount);
    await list.assertName(newListName);
});

test("hide owner removes the owner from the list card", async ({ page, userData }) => {
    const listsPage = new ListsPage(page);
    await listsPage.goto();

    // The owner is shown on the card by default
    const list = await listsPage.getListAt(0);
    await list.assertOwner(userData.name);

    // Enable "Hide Owner" in the manage form and save
    await list
        .click()
        .then((listPage) => listPage.manage())
        .then((manage) => manage.at())
        .then((manage) => manage.setHideOwner(true))
        .then((manage) => manage.save());

    // The owner should no longer be rendered on the list card
    await listsPage.goto();
    await listsPage.getListAt(0).then((card) => card.assertOwnerHidden());
});

test("delete list", async ({ page }) => {
    const listsPage = new ListsPage(page);
    await listsPage.goto();

    const countBefore = await listsPage.getListCount();

    const createListPage = await listsPage.create();
    await createListPage.at();
    await createListPage.createDefault();

    await listsPage.goto();
    await listsPage.expectListCount(countBefore + 1);

    const newList = await listsPage.getListAt(countBefore);
    const manageListPage = await newList.click().then((list) => list.manage());
    await manageListPage.delete();

    await listsPage.at();
    await listsPage.expectListCount(countBefore);
});

test("multiple users and list filter", async ({
    page: user1Page,
    userData,
    additionalPage: user2Page,
    additionalUserData: user2
}) => {
    const user1ListsPage = new ListsPage(user1Page);
    await user1ListsPage.goto();

    const user1List = await user1ListsPage.getListAt(0);
    await user1List.assertOwner(userData.name);

    const user2ListsPage = new ListsPage(user2Page);
    await user2ListsPage.goto();
    const user2List = await user2ListsPage.getListAt(0);
    await user2List.assertOwner(user2.name);

    await user1ListsPage.expectListCount(2);
    await user2ListsPage.expectListCount(2);

    // Assert second list from User 1's perspective is User 2's list
    await user1ListsPage.getListAt(1).then((list) => list.assertOwner(user2.name));
    // Assert second list from User 2's perspective is User 1's list
    await user2ListsPage.getListAt(1).then((list) => list.assertOwner(userData.name));

    // Filter by user 1 lists
    await user1ListsPage.filterLists(userData.name);
    await user1ListsPage.expectListCount(1);
    await user1ListsPage.getListAt(0).then((list) => list.assertOwner(userData.name));

    await user1ListsPage.clearFilter();
    await user1ListsPage.expectListCount(2);

    // Filter by user 2 lists
    await user1ListsPage.filterLists(user2.name);
    await user1ListsPage.expectListCount(1);
    await user1ListsPage.getListAt(0).then((list) => list.assertOwner(user2.name));

    for (const [language, overview, myLists] of [
        ["en", "Overview", "My Lists"],
        ["de", "Übersicht", "Meine Listen"]
    ]) {
        await user1Page.request.post("/?/language", {
            form: { language },
            headers: { Origin: new URL(user1Page.url()).origin }
        });
        await user1Page.goto("/lists");
        await expect(user1Page).toHaveTitle(overview);
        await expect(user1Page.locator("header h1")).toHaveText(overview);
        await expect(user1Page.getByTestId("list-filter")).toBeVisible();
        await user1ListsPage.expectListCount(2);

        const navigation = user1Page.getByRole("navigation").filter({ visible: true });
        await navigation.getByRole("link", { name: myLists, exact: true }).click();
        await expect(user1Page).toHaveTitle(myLists);
        await expect(user1Page.locator("header h1")).toHaveText(myLists);
        await expect(user1Page.getByTestId("list-filter")).toHaveCount(0);
        await user1ListsPage.expectListCount(1);
        await user1ListsPage.getListAt(0).then((list) => list.assertOwner(userData.name));
        await user1Page.reload();
        await expect(user1Page).toHaveTitle(myLists);
        await expect(user1Page.getByTestId("list-filter")).toHaveCount(0);

        for (const users of [`${userData.id},${user2.id}`, encodeURIComponent(`${userData.id},${user2.id}`)]) {
            await user1Page.goto(`/lists?${new URLSearchParams({ users })}`);
            await expect(user1Page).toHaveTitle(overview);
            await expect(user1Page.getByTestId("list-filter")).toBeVisible();
            await expect(navigation.locator('[aria-current="page"]')).toHaveText(overview);
            await user1ListsPage.expectListCount(2);
        }
    }
});
