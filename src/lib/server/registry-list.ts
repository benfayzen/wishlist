import { client } from "$lib/server/prisma";
import type { Prisma } from "$lib/generated/prisma/client";

export class RegistryListError extends Error {
    constructor(public readonly reason: "forbidden" | "invalid-managers" | "invalid-name") {
        super(reason);
    }
}

type RegistryProperties = Pick<Prisma.ListCreateInput, "name" | "icon" | "iconColor" | "description">;

async function validateManagers(tx: Prisma.TransactionClient, ids: string[]) {
    const managers = [...new Set(ids)];
    if (!managers.length || (await tx.user.count({ where: { id: { in: managers } } })) !== managers.length) {
        throw new RegistryListError("invalid-managers");
    }
    return managers;
}

export async function createRegistry(actorId: string, properties: RegistryProperties, managerIds: string[]) {
    if (!properties.name?.trim()) throw new RegistryListError("invalid-name");
    return client.$transaction(async (tx) => {
        const managers = await validateManagers(tx, [actorId, ...managerIds]);
        return tx.list.create({
            data: {
                ...properties,
                ownerId: null,
                listMode: "registry",
                groupId: "global",
                public: true,
                hideOwner: true,
                notForMe: true,
                managers: { create: managers.map((userId) => ({ userId })) }
            }
        });
    });
}

export async function updateRegistry(
    listId: string,
    actorId: string,
    properties: RegistryProperties,
    managerIds: string[]
) {
    if (!properties.name?.trim()) throw new RegistryListError("invalid-name");
    return client.$transaction(async (tx) => {
        const permitted = await tx.list.count({
            where: { id: listId, listMode: "registry", managers: { some: { userId: actorId } } }
        });
        if (!permitted) throw new RegistryListError("forbidden");
        const managers = await validateManagers(tx, managerIds);
        await tx.listManager.deleteMany({ where: { listId, userId: { notIn: managers } } });
        const existing = new Set(
            (await tx.listManager.findMany({ where: { listId }, select: { userId: true } })).map(({ userId }) => userId)
        );
        await tx.listManager.createMany({
            data: managers.filter((id) => !existing.has(id)).map((userId) => ({ listId, userId }))
        });
        await tx.listGroupShare.deleteMany({ where: { listId } });
        return tx.list.update({
            where: { id: listId },
            data: { ...properties, ownerId: null, groupId: "global", public: true, hideOwner: true, notForMe: true }
        });
    });
}
