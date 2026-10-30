import assert from "node:assert/strict";
import test from "node:test";
import { userCanEdit, userCanEditOnSomeList } from "../../src/lib/item-util.ts";

const registry = (id, managers) => ({
    list: { id, listMode: "registry", ownerId: null, managers: managers.map((userId) => ({ userId })) }
});
const item = (lists) => ({ user: { id: "creator" }, createdById: "creator", lists });

test("former registry creator has no implicit editing rights", () => {
    const list = registry("celebration", ["successor"]);
    assert.equal(userCanEditOnSomeList(item([list]), "creator"), false);
    assert.equal(userCanEdit({ ...item([list]), ...list }, "creator"), false);
});

test("current registry manager can edit regardless of attribution", () => {
    const list = registry("celebration", ["successor"]);
    assert.equal(userCanEditOnSomeList(item([list]), "successor"), true);
    assert.equal(userCanEdit({ ...item([list]), ...list }, "successor"), true);
    assert.equal(userCanEditOnSomeList(item([list]), undefined), false);
});

test("shared item editing requires management of every registry it affects", () => {
    const lists = [registry("wedding", ["creator", "successor"]), registry("housewarming", ["successor"])];
    assert.equal(userCanEditOnSomeList(item(lists), "creator"), false);
    assert.equal(userCanEditOnSomeList(item(lists), "successor"), true);
});

test("legacy wishlist ownership cannot bypass registry manager rights", () => {
    const lists = [
        registry("celebration", ["successor"]),
        { list: { id: "birthday", listMode: "standard", ownerId: "creator", managers: [] } }
    ];
    assert.equal(userCanEditOnSomeList(item(lists), "creator"), false);
    assert.equal(userCanEditOnSomeList(item([lists[1]]), "creator"), true);
});
