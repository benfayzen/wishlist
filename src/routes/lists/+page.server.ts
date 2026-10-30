import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { client } from "$lib/server/prisma";
import { getConfig } from "$lib/server/config";
import { decodeMultiValueFilter } from "$lib/server/sort-filter-util";
import { requireLogin } from "$lib/server/auth";
import { sharedWithGroup } from "$lib/server/list-sharing";

export const load = (async ({ url }) => {
    const user = requireLogin();

    const memberships = await client.userGroupMembership.findMany({
        where: { userId: user.id },
        select: { groupId: true }
    });
    const soleGroupId = memberships.length === 1 ? memberships[0].groupId : undefined;
    const config = await getConfig(soleGroupId);
    if (config.listMode === "registry" && memberships.length === 1 && url.searchParams.get("users") !== user.id) {
        const list = await client.list.findFirst({
            select: {
                id: true
            },
            where: {
                ownerId: user.id,
                ...sharedWithGroup(soleGroupId!)
            }
        });
        if (list) {
            redirect(302, `/lists/${list.id}`);
        }
        return {
            myLists: [],
            otherLists: [],
            users: [
                {
                    id: user.id,
                    name: user.name,
                    picture: user.picture || null
                }
            ]
        };
    }

    const userIdFilter = decodeMultiValueFilter(url.searchParams.get("users"));
    const ownView = userIdFilter.length === 1 && userIdFilter[0] === user.id;
    const requestedGroups = decodeMultiValueFilter(url.searchParams.get("groups"));
    const groupIds = memberships
        .map(({ groupId }) => groupId)
        .filter((id) => requestedGroups.length === 0 || requestedGroups.includes(id));
    const visibleGroups = { groupShares: { some: { groupId: { in: groupIds } } } };

    const userListsQuery = client.list.findMany({
        where: {
            ownerId: user.id,
            ...(ownView ? {} : visibleGroups)
        },
        orderBy: {
            name: "asc"
        },
        select: {
            id: true,
            groupId: true,
            name: true,
            icon: true,
            iconColor: true,
            hideOwner: true,
            owner: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    picture: true
                }
            },
            items: {
                select: {
                    id: true,
                    addedById: true,
                    item: {
                        select: {
                            quantity: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    items: {
                        where: {
                            approved: false
                        }
                    }
                }
            }
        }
    });

    const otherListsQuery = client.list.findMany({
        where: {
            ownerId: {
                not: user.id
            },
            ...visibleGroups
        },
        orderBy: [
            {
                owner: {
                    name: "asc"
                }
            },
            {
                name: "asc"
            }
        ],
        select: {
            id: true,
            name: true,
            icon: true,
            iconColor: true,
            hideOwner: true,
            owner: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    picture: true
                }
            },
            items: {
                select: {
                    id: true,
                    approved: true,
                    item: {
                        select: {
                            id: true,
                            quantity: true,
                            claims: {
                                select: {
                                    id: true,
                                    quantity: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    const [myLists, otherLists] = await Promise.all([userListsQuery, otherListsQuery]);
    const listConfigs = new Map(
        await Promise.all(
            [...new Set(myLists.map((list) => list.groupId))].map(async (id) => [id, await getConfig(id)] as const)
        )
    );

    const users = [
        {
            id: user.id,
            name: user.name,
            picture: user.picture || null
        },
        ...new Set(
            otherLists.map((list) => ({
                id: list.owner.id,
                name: list.owner.name,
                picture: list.owner.picture || null
            }))
        )
    ];

    return {
        myLists: myLists
            .filter((list) => userIdFilter.length === 0 || userIdFilter.includes(list.owner.id))
            .map((list) => {
                const listConfig = listConfigs.get(list.groupId)!;
                const visibleItems = list.items.filter(
                    (item) =>
                        !listConfig.suggestions.enable ||
                        listConfig.suggestions.method !== "surprise" ||
                        item.addedById === user.id
                );
                return {
                    id: list.id,
                    name: list.name,
                    icon: list.icon,
                    iconColor: list.iconColor,
                    hideOwner: list.hideOwner,
                    owner: list.owner,
                    claimedCount: undefined,
                    itemCount: visibleItems.reduce((accum, { item }) => accum + (item.quantity || 1), 0),
                    unapprovedCount: list._count.items
                };
            }),
        otherLists: otherLists
            .filter((list) => userIdFilter.length === 0 || userIdFilter.includes(list.owner.id))
            .map((list) => {
                const claimedCount = list.items
                    .filter((it) => it.approved)
                    .reduce((accum, { item }) => {
                        if (item.quantity === null) return accum;
                        const itemClaimed = item.claims.reduce((a, { quantity }) => a + quantity, 0);
                        return accum + Math.min(itemClaimed, item.quantity);
                    }, 0);
                const itemCount = list.items
                    .filter((it) => it.approved)
                    .reduce((accum, { item }) => accum + (item.quantity || 1), 0);
                const items = list.items.map((it) => ({ id: it.item.id }));
                return {
                    id: list.id,
                    name: list.name,
                    icon: list.icon,
                    iconColor: list.iconColor,
                    hideOwner: list.hideOwner,
                    owner: list.owner,
                    claimedCount,
                    itemCount,
                    items
                };
            }),
        users
    };
}) satisfies PageServerLoad;
