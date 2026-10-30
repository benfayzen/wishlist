import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { client } from "$lib/server/prisma";
import { getFormatter } from "$lib/server/i18n";
import { getListPropertiesSchema } from "$lib/server/validations";
import { trimToNull } from "$lib/util";
import { adjustListManagers, deleteList } from "$lib/server/list";
import { getConfig } from "$lib/server/config";
import { requireLogin } from "$lib/server/auth";
import { logger } from "$lib/server/logger";
import z from "zod";
import { resolve } from "$app/paths";
import { getShareableGroups, replaceListGroups, ListSharingError } from "$lib/server/list-sharing";

export const load: PageServerLoad = async ({ params }) => {
    const user = requireLogin();

    const $t = await getFormatter();

    const list = await client.list
        .findUnique({
            where: {
                id: params.id
            },
            select: {
                id: true,
                name: true,
                icon: true,
                iconColor: true,
                public: true,
                hideOwner: true,
                allowSelfClaims: true,
                notForMe: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        picture: true
                    }
                },
                managers: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true
                            }
                        }
                    }
                },
                groupId: true,
                groupShares: { select: { groupId: true } },
                description: true
            }
        })
        .then((list) => list ?? error(404, $t("errors.list-not-found")));

    // Logged in users must be in the correct group, or viewing a public list
    if (list.owner.id !== user.id && !list.managers.find(({ user: manager }) => manager.id === user.id)) {
        error(401, $t("errors.not-authorized"));
    }
    const config = await getConfig(list.groupId);

    return {
        themeSeed: list.iconColor,
        groupOptions: await getShareableGroups(list.owner.id, user.id),
        selectedGroupIds: list.groupShares.map(({ groupId }) => groupId),
        list: {
            ...list,
            managers: list.managers.map(({ user }) => ({ ...user }))
        },
        listMode: config.listMode,
        allowsPublicLists: config.allowPublicLists,
        claimsVisibleToOwner: config.claims.showForOwner,
        groupId:
            (await getShareableGroups(list.owner.id, user.id)).find((group) =>
                list.groupShares.some((share) => share.groupId === group.id)
            )?.id ?? ""
    };
};

export const actions: Actions = {
    persist: async ({ request, params }) => {
        const user = requireLogin();
        const $t = await getFormatter();

        await canManage(params.id, user);
        const settings = await client.list.findUniqueOrThrow({ where: { id: params.id }, select: { groupId: true } });
        const config = await getConfig(settings.groupId);

        const form = await request.formData();
        const listPropertiesSchema = getListPropertiesSchema();
        const listProperties = listPropertiesSchema.safeParse({
            name: form.get("name"),
            icon: form.get("icon"),
            iconColor: form.get("iconColor"),
            public: form.get("public"),
            hideOwner: form.get("hideOwner"),
            description: form.get("description"),
            managers: form.getAll("managers"),
            allowSelfClaims: form.get("allowSelfClaims"),
            notForMe: form.get("notForMe")
        });
        if (listProperties.error) {
            return fail(422, {
                success: false,
                errors: z.flattenError(listProperties.error).fieldErrors
            });
        }
        if (listProperties.data.public && !config.allowPublicLists) {
            return fail(400, {
                action: "persist",
                success: false,
                message: $t("errors.public-lists-not-allowed")
            });
        }
        if (!listProperties.data.public && config.listMode === "registry") {
            listProperties.data.public = true;
        }
        if (listProperties.data.allowSelfClaims && !config.claims.showForOwner) {
            return fail(400, {
                action: "persist",
                success: false,
                message: $t("errors.self-claims-not-available")
            });
        }

        try {
            const groupIds =
                form.has("groupsProvided") || form.has("groups")
                    ? form.getAll("groups").map(String)
                    : (
                          await client.listGroupShare.findMany({
                              where: { listId: params.id },
                              select: { groupId: true }
                          })
                      ).map(({ groupId }) => groupId);
            await replaceListGroups(params.id, user.id, groupIds, {
                name: trimToNull(listProperties.data.name),
                icon: trimToNull(listProperties.data.icon),
                iconColor: trimToNull(listProperties.data.iconColor),
                public: listProperties.data.public,
                hideOwner: listProperties.data.hideOwner,
                allowSelfClaims: listProperties.data.allowSelfClaims,
                notForMe: listProperties.data.notForMe,
                description: trimToNull(listProperties.data.description)
            });

            await adjustListManagers(params.id, listProperties.data.managers);
        } catch (err) {
            if (err instanceof ListSharingError) {
                return fail(403, { action: "persist", success: false, message: $t("errors.not-authorized") });
            }
            logger.error({ err }, "Unable to update list settings");
            return fail(500, {
                action: "persist",
                success: false,
                message: $t("errors.unable-to-update-list-settings")
            });
        }

        return redirect(302, resolve("/lists/[id]", { id: params.id }));
    },
    delete: async ({ params }) => {
        const user = requireLogin();
        const $t = await getFormatter();

        const listOwner = await client.list.findUnique({
            select: {
                ownerId: true
            },
            where: {
                id: params.id
            }
        });
        if (user.id !== listOwner?.ownerId) {
            error(401, $t("errors.not-authorized"));
        }

        try {
            await deleteList(params.id);
        } catch (err) {
            logger.error({ err }, "Unable to delete list");
            return fail(500, { action: "delete", success: false, message: $t("errors.unable-to-delete-list") });
        }

        return redirect(302, resolve("/lists"));
    }
};

async function canManage(id: string, user: LocalUser) {
    const $t = await getFormatter();

    const list = await client.list.findUnique({
        select: {
            ownerId: true,
            managers: {
                select: {
                    userId: true
                }
            }
        },
        where: {
            id
        }
    });
    if (!list) {
        error(404, $t("errors.list-not-found"));
    }
    if (user.id !== list.ownerId && !list.managers.find(({ userId }) => userId === user.id)) {
        error(401, $t("errors.not-authorized"));
    }
}
