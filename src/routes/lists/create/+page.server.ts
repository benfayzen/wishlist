import { getConfig } from "$lib/server/config";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getFormatter } from "$lib/server/i18n";
import { trimToNull } from "$lib/util";
import { getListPropertiesSchema } from "$lib/server/validations";
import { adjustListManagers, create } from "$lib/server/list";
import { client } from "$lib/server/prisma";
import { requireLogin } from "$lib/server/auth";
import { logger } from "$lib/server/logger";
import z from "zod";
import { resolve } from "$app/paths";
import { getShareableGroups, ListSharingError } from "$lib/server/list-sharing";

export const load = (async () => {
    const user = requireLogin();

    const groupOptions = await getShareableGroups(user.id, user.id);
    if (!groupOptions.length) redirect(302, "/account/groups#create");
    const groupId = groupOptions[0].id;
    const config = await getConfig(groupId);
    if (config.listMode === "registry" && groupOptions.length === 1) {
        const listCount = await client.list.count({
            where: {
                ownerId: user.id,
                groupId
            }
        });
        if (listCount === 1) {
            redirect(302, "/wishlists/me");
        }
    }

    return {
        groupOptions,
        groupPolicies: await Promise.all(
            groupOptions.map(async ({ id }) => {
                const rules = await getConfig(id);
                return {
                    id,
                    listMode: rules.listMode,
                    allowsPublicLists: rules.allowPublicLists,
                    claimsVisibleToOwner: rules.claims.showForOwner
                };
            })
        ),
        selectedGroupIds: [groupId],
        list: {
            name: null,
            icon: null,
            owner: {
                id: user.id,
                name: user.name,
                username: user.username,
                picture: user.picture || null
            },
            description: null,
            hideOwner: false,
            managers: []
        },
        listMode: config.listMode,
        allowsPublicLists: config.allowPublicLists,
        claimsVisibleToOwner: config.claims.showForOwner,
        groupId
    };
}) satisfies PageServerLoad;

export const actions: Actions = {
    persist: async ({ request }) => {
        const user = requireLogin();
        const $t = await getFormatter();

        const form = await request.formData();
        const allowedGroups = await getShareableGroups(user.id, user.id);
        const groups =
            form.has("groupsProvided") || form.has("groups")
                ? [...new Set(form.getAll("groups").map(String))]
                : allowedGroups.slice(0, 1).map(({ id }) => id);
        if (!groups.length || groups.some((id) => !allowedGroups.some((group) => group.id === id))) {
            return fail(403, { success: false, error: $t("errors.not-authorized") });
        }
        const groupId = groups[0];
        const config = await getConfig(groupId);
        if (config.listMode === "registry") {
            const listCount = await client.list.count({
                where: {
                    ownerId: user.id,
                    groupId
                }
            });
            if (listCount === 1) {
                return fail(400, {
                    success: false,
                    error: $t("errors.in-registry-mode-you-can-only-have-one-list")
                });
            }
        }

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
                formErrors: z.flattenError(listProperties.error).fieldErrors
            });
        }
        if (listProperties.data.public && !config.allowPublicLists) {
            return fail(400, {
                action: "create",
                success: false,
                message: $t("errors.public-lists-not-allowed")
            });
        }
        if (!listProperties.data.public && config.listMode === "registry") {
            listProperties.data.public = true;
        }
        if (listProperties.data.allowSelfClaims && !config.claims.showForOwner) {
            return fail(400, {
                action: "create",
                success: false,
                message: $t("errors.self-claims-not-available")
            });
        }

        let list;
        try {
            const data = {
                name: trimToNull(listProperties.data.name),
                icon: trimToNull(listProperties.data.icon),
                iconColor: trimToNull(listProperties.data.iconColor),
                public: listProperties.data.public,
                hideOwner: listProperties.data.hideOwner,
                allowSelfClaims: listProperties.data.allowSelfClaims,
                notForMe: listProperties.data.notForMe,
                description: trimToNull(listProperties.data.description)
            };
            list = await create(user.id, groupId, data, groups);
            await adjustListManagers(list.id, listProperties.data.managers);
        } catch (err) {
            if (list) await client.list.delete({ where: { id: list.id } });
            if (err instanceof ListSharingError) {
                return fail(403, { success: false, error: $t("errors.not-authorized") });
            }
            logger.error({ err }, "Unable to create list");
            return fail(500, { success: false, error: $t("errors.unable-to-create-list") });
        }

        return redirect(302, resolve("/lists/[id]", { id: list.id }));
    }
};
