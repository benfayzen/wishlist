import type { PageServerLoad } from "./$types";
import { client } from "$lib/server/prisma";
import { toItemOnListDTO } from "$lib/dtos/item-mapper";
import { requireLogin } from "$lib/server/auth";
import { decodeMultiValueFilter } from "$lib/server/sort-filter-util";
import { getConfig } from "$lib/server/config";
import { getItemInclusions } from "$lib/server/items";

export const load: PageServerLoad = async ({ url, cookies, depends }) => {
    depends("data:claims");
    const user = requireLogin();
    const userIdFilter = decodeMultiValueFilter(url.searchParams.get("users"));
    // Own reservations remain manageable even after a group share is revoked.
    const claims = await client.itemClaim.findMany({
        where: { claimedById: user.id, item: { userId: userIdFilter.length ? { in: userIdFilter } : undefined } },
        include: { item: { include: getItemInclusions() }, list: { select: { groupId: true, notForMe: true } } },
        orderBy: { id: "asc" }
    });
    const configs = new Map(
        await Promise.all(
            [...new Set(claims.map((claim) => claim.list.groupId))].map(
                async (id) => [id, await getConfig(id)] as const
            )
        )
    );
    return {
        user,
        items: claims.map((claim) => ({
            ...toItemOnListDTO(
                { ...claim.item, claims: claim.item.claims.filter(({ id }) => id === claim.id) },
                claim.listId
            ),
            groupId: claim.list.groupId,
            showClaimForOwner: configs.get(claim.list.groupId)!.claims.showForOwner || claim.list.notForMe
        })),
        initialViewPreference: cookies.get("listViewPreference") === "list" ? ("list" as const) : ("tile" as const)
    };
};
