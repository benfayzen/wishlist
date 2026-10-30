import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getConfig } from "$lib/server/config";
import { getFormatter } from "$lib/server/i18n";
import { getById, getItems, type GetItemsOptions } from "$lib/server/list";
import type { UserGroupMembership } from "$lib/generated/prisma/client";
import { getListMembership } from "$lib/server/list-sharing";
import { visibleClaims } from "$lib/server/claim-visibility";

export const load = (async ({ params, url, locals, depends, cookies }) => {
    const $t = await getFormatter();

    const list = await getById(params.id);

    let activeMembership: UserGroupMembership | undefined;
    if (!locals.user) {
        // Unauthenticated users can only view public lists
        if (!list || !list.public) {
            // Redirect to login so we don't expose details if the list does exist
            const redirectTo = url.pathname + url.search;
            const params = new URLSearchParams({ redirectTo });
            redirect(307, `/login?${params}`);
        }
    } else {
        // Logged in users must be in the correct group, or viewing a public list
        if (!list) error(404, $t("errors.list-not-found"));
        const sharedMembership = await getListMembership(list, locals.user.id);
        activeMembership = sharedMembership ?? undefined;
        if (!list.public && list.owner.id !== locals.user.id && !sharedMembership) {
            error(404, $t("errors.list-not-found"));
        }
    }

    const config = await getConfig(list.groupId);

    const isSelfClaimable = list.allowSelfClaims || list.notForMe;
    const options: GetItemsOptions = {
        filter: url.searchParams.get("filter"),
        sort: url.searchParams.get("sort"),
        sortDir: url.searchParams.get("dir"),
        suggestionMethod: list.listMode === "registry" ? "approval" : config.suggestions.method,
        listOwnerId: list.owner.id,
        listManagers: new Set(list.managers.map(({ userId }) => userId)),
        loggedInUserId: locals.user?.id || null,
        isSelfClaimable
    };

    const items = await getItems(list.id, options);

    depends("data:items");

    // Read view preference from cookie (for SSR to prevent flicker)
    const viewPreference: "list" | "tile" = cookies.get("listViewPreference") === "list" ? "list" : "tile";

    return {
        themeSeed: list.iconColor,
        list: {
            ...list,
            isSelfClaimable,
            owner: {
                ...list.owner,
                isMe: list.owner.id === locals.user?.id,
                activeGroupId: list.groupId
            },
            isManager: list.managers.find(({ userId }) => userId === locals.user?.id) !== undefined,
            items: items.map((item) =>
                visibleClaims(item, config, locals.user?.id, activeMembership?.groupId, list.notForMe)
            )
        },
        loggedInUser: locals.user
            ? {
                  id: locals.user.id,
                  username: locals.user.username,
                  name: locals.user.name,
                  activeGroupId: activeMembership?.groupId ?? list.groupId
              }
            : undefined,
        listMode: list.listMode,
        showClaimedName: config.claims.showName,
        showNameAcrossGroups: config.claims.showNameAcrossGroups,
        showClaimForOwner: config.claims.showForOwner || list.notForMe,
        showPublicClaimName: config.claims.showNamePublic,
        requireClaimEmail: config.claims.requireEmail,
        suggestionsEnabled: list.listMode !== "registry" && config.suggestions.enable,
        initialViewPreference: viewPreference
    };
}) satisfies PageServerLoad;
