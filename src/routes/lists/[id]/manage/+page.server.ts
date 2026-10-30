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
import { updateRegistry, RegistryListError } from "$lib/server/registry-list";

async function canManage(id: string, userId: string) {
    const $t = await getFormatter();
    const list = await client.list.findUnique({ where: { id }, include: { managers: true } });
    if (!list) error(404, $t("errors.list-not-found"));
    const manager = list.managers.some((manager) => manager.userId === userId);
    if (!manager && (list.listMode === "registry" || list.ownerId !== userId)) error(403, $t("errors.not-authorized"));
    return list;
}

export const load: PageServerLoad = async ({ params }) => {
    const user = requireLogin();
    await canManage(params.id, user.id);
    const list = await client.list.findUniqueOrThrow({
        where: { id: params.id },
        include: {
            owner: { select: { id: true, name: true, username: true, picture: true } },
            managers: { select: { user: { select: { id: true, name: true, username: true } } } },
            groupShares: { select: { groupId: true } }
        }
    });
    const config = await getConfig(list.groupId);
    const groupOptions = list.listMode === "registry" ? [] : await getShareableGroups(list.ownerId!, user.id);
    return {
        themeSeed: list.iconColor,
        groupOptions,
        selectedGroupIds: list.groupShares.map(({ groupId }) => groupId),
        list: {
            ...list,
            owner: list.owner ?? {
                id: user.id,
                name: user.name,
                username: user.username,
                picture: user.picture ?? null
            },
            managers: list.managers.map(({ user }) => user)
        },
        listMode: list.listMode as ListMode,
        allowsPublicLists: config.allowPublicLists,
        claimsVisibleToOwner: config.claims.showForOwner,
        groupId: groupOptions.find((group) => list.groupShares.some((share) => share.groupId === group.id))?.id ?? ""
    };
};

export const actions: Actions = {
    persist: async ({ request, params }) => {
        const user = requireLogin();
        const $t = await getFormatter();
        const list = await canManage(params.id, user.id);
        const config = await getConfig(list.groupId);
        const form = await request.formData();
        if (form.has("listMode") && form.get("listMode") !== list.listMode) {
            return fail(422, { action: "persist", success: false, message: $t("wishes.list-type-fixed") });
        }
        const parsed = getListPropertiesSchema().safeParse({
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
        if (!parsed.success) return fail(422, { success: false, errors: z.flattenError(parsed.error).fieldErrors });
        const properties = parsed.data;
        const isRegistry = list.listMode === "registry";
        if (!isRegistry && properties.public && !config.allowPublicLists)
            return fail(400, { action: "persist", success: false, message: $t("errors.public-lists-not-allowed") });
        if (!isRegistry && properties.allowSelfClaims && !config.claims.showForOwner)
            return fail(400, { action: "persist", success: false, message: $t("errors.self-claims-not-available") });
        try {
            const identity = {
                name: trimToNull(properties.name),
                icon: trimToNull(properties.icon),
                iconColor: trimToNull(properties.iconColor),
                description: trimToNull(properties.description)
            };
            if (isRegistry) {
                if (form.getAll("groups").length)
                    return fail(422, { action: "persist", success: false, message: $t("wishes.invalid-list-groups") });
                await updateRegistry(list.id, user.id, identity, properties.managers ?? []);
            } else {
                const groupIds =
                    form.has("groupsProvided") || form.has("groups")
                        ? form.getAll("groups").map(String)
                        : (
                              await client.listGroupShare.findMany({
                                  where: { listId: list.id },
                                  select: { groupId: true }
                              })
                          ).map(({ groupId }) => groupId);
                await replaceListGroups(list.id, user.id, groupIds, {
                    ...identity,
                    public: properties.public,
                    hideOwner: properties.hideOwner,
                    allowSelfClaims: properties.allowSelfClaims,
                    notForMe: properties.notForMe
                });
                await adjustListManagers(list.id, properties.managers);
            }
        } catch (err) {
            if (err instanceof RegistryListError)
                return fail(err.reason === "forbidden" ? 403 : 422, {
                    action: "persist",
                    success: false,
                    message: $t(`wishes.registry-${err.reason}`)
                });
            if (err instanceof ListSharingError)
                return fail(403, { action: "persist", success: false, message: $t("errors.not-authorized") });
            logger.error({ err }, "Unable to update list settings");
            return fail(500, {
                action: "persist",
                success: false,
                message: $t("errors.unable-to-update-list-settings")
            });
        }
        redirect(302, resolve("/lists/[id]", { id: list.id }));
    },
    delete: async ({ params }) => {
        const user = requireLogin();
        const $t = await getFormatter();
        const list = await canManage(params.id, user.id);
        if (list.listMode !== "registry" && list.ownerId !== user.id) error(403, $t("errors.not-authorized"));
        await deleteList(list.id);
        redirect(302, resolve("/lists"));
    }
};
