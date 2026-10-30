import { client } from "$lib/server/prisma";
import type { Prisma } from "$lib/generated/prisma/client";

export class ListSharingError extends Error {
    constructor(public readonly reason: "not-found" | "forbidden" | "invalid-groups") {
        super(reason);
    }
}

/** Replace visibility atomically, without modifying items or reservations.
 */
export const replaceListGroups = async (
    listId: string,
    actorId: string,
    groupIds: string[],
    properties?: Pick<
        Prisma.ListUpdateInput,
        "name" | "icon" | "iconColor" | "public" | "hideOwner" | "allowSelfClaims" | "notForMe" | "description"
    >
) => {
    const selected = [...new Set(groupIds)];
    if (selected.length === 0 || selected.some((id) => !id)) {
        throw new ListSharingError("invalid-groups");
    }

    return client.$transaction(async (tx) => {
        const list = await tx.list.findUnique({
            where: { id: listId },
            select: {
                ownerId: true,
                listMode: true,
                groupId: true,
                managers: { select: { userId: true } },
                groupShares: { select: { groupId: true } }
            }
        });
        if (!list) throw new ListSharingError("not-found");
        if (list.listMode === "registry" || !list.ownerId) throw new ListSharingError("forbidden");
        if (list.ownerId !== actorId && !list.managers.some((manager) => manager.userId === actorId)) {
            throw new ListSharingError("forbidden");
        }

        const memberships = await tx.userGroupMembership.findMany({
            where: { userId: { in: [list.ownerId, actorId] } },
            select: { userId: true, groupId: true }
        });
        const actorGroups = new Set(memberships.filter((m) => m.userId === actorId).map((m) => m.groupId));
        const ownerGroups = new Set(memberships.filter((m) => m.userId === list.ownerId).map((m) => m.groupId));
        const existing = new Set(list.groupShares.map((share) => share.groupId));
        for (const id of selected) {
            if (!existing.has(id) && (!actorGroups.has(id) || !ownerGroups.has(id))) {
                throw new ListSharingError("forbidden");
            }
        }
        for (const id of existing) {
            if (!selected.includes(id) && !actorGroups.has(id)) {
                throw new ListSharingError("forbidden");
            }
        }
        await tx.listGroupShare.deleteMany({ where: { listId, groupId: { notIn: selected } } });
        for (const groupId of selected) {
            await tx.listGroupShare.upsert({
                where: { listId_groupId: { listId, groupId } },
                create: { listId, groupId },
                update: {}
            });
        }
        if (properties) await tx.list.update({ where: { id: listId }, data: properties });
        return selected;
    });
};

export const sharedWithGroup = (groupId: string) => ({ groupShares: { some: { groupId } } });

export const isSharedWithGroup = (list: { groupShares: { groupId: string }[] }, groupId: string) =>
    list.groupShares.some((share) => share.groupId === groupId);

export const getListMembership = (list: { groupShares: { groupId: string }[] }, userId: string) =>
    client.userGroupMembership.findFirst({
        where: { userId, groupId: { in: list.groupShares.map((share) => share.groupId) } },
        orderBy: { groupId: "asc" }
    });

export const getShareableGroups = async (ownerId: string, actorId: string) =>
    client.group.findMany({
        where: {
            AND: [ownerId, actorId].map((userId) => ({ UserGroupMembership: { some: { userId } } }))
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
    });
