import { getFormatter } from "$lib/server/i18n";
import { Role } from "$lib/schema";
import { requireRole } from "$lib/server/auth";
import { tryDeleteImage } from "$lib/server/image-util";
import { RegistryListError } from "$lib/server/registry-list";
import { client } from "$lib/server/prisma";
import { type RequestHandler, error } from "@sveltejs/kit";

export const DELETE: RequestHandler = async ({ params }) => {
    const authUser = await requireRole(Role.ADMIN);
    const $t = await getFormatter();

    if (!params.userId) {
        error(400, $t("errors.must-specify-an-item-to-delete"));
    }

    const user = await client.user.findUnique({
        where: {
            id: params.userId
        },
        select: {
            id: true
        }
    });

    if (!user) {
        error(404, $t("errors.user-not-found"));
    }

    if (user.id === authUser.id) {
        error(400, $t("errors.cannot-delete-yourself"));
    }

    try {
        const deletedUser = await client.$transaction(async (tx) => {
            const registries = await tx.list.findMany({
                where: {
                    listMode: "registry",
                    OR: [
                        { managers: { some: { userId: user.id } } },
                        {
                            items: {
                                some: {
                                    OR: [
                                        { addedById: user.id },
                                        { item: { OR: [{ userId: user.id }, { createdById: user.id }] } }
                                    ]
                                }
                            }
                        }
                    ]
                },
                select: { id: true, managers: { select: { userId: true } } }
            });
            for (const registry of registries) {
                const successor = registry.managers.find((manager) => manager.userId !== user.id)?.userId;
                if (!successor) throw new RegistryListError("invalid-managers");
                // Keep registry contents when an attributed account is deleted.
                const scope = { lists: { some: { listId: registry.id } } };
                await tx.item.updateMany({ where: { ...scope, userId: user.id }, data: { userId: successor } });
                await tx.item.updateMany({
                    where: { ...scope, createdById: user.id },
                    data: { createdById: successor }
                });
                await tx.listItem.updateMany({
                    where: { listId: registry.id, addedById: user.id },
                    data: { addedById: successor }
                });
            }
            return tx.user.delete({ where: { id: user.id } });
        });
        if (deletedUser && deletedUser.picture) {
            await tryDeleteImage(deletedUser.picture);
        }

        return new Response(JSON.stringify(deletedUser), { status: 200 });
    } catch (err) {
        if (err instanceof RegistryListError) error(409, $t("wishes.registry-last-manager-delete"));
        error(404, $t("errors.user-not-found"));
    }
};
