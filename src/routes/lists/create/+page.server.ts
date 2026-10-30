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
import { getShareableGroups } from "$lib/server/list-sharing";
import { createRegistry, RegistryListError } from "$lib/server/registry-list";

export const load = (async () => {
    const user = requireLogin();
    const groupOptions = await getShareableGroups(user.id, user.id);
    const groupId = groupOptions[0]?.id ?? "";
    const config = await getConfig(groupId || undefined);
    return {
        groupOptions,
        groupPolicies: await Promise.all(
            groupOptions.map(async ({ id }) => {
                const rules = await getConfig(id);
                return {
                    id,
                    allowsPublicLists: rules.allowPublicLists,
                    claimsVisibleToOwner: rules.claims.showForOwner
                };
            })
        ),
        selectedGroupIds: groupId ? [groupId] : [],
        list: {
            name: null,
            icon: null,
            owner: { id: user.id, name: user.name, username: user.username, picture: user.picture || null },
            description: null,
            hideOwner: false,
            managers: []
        },
        listMode: "standard" as ListMode,
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
        const mode = z.enum(["standard", "registry"]).safeParse(form.get("listMode") ?? "standard");
        if (!mode.success) return fail(422, { success: false, error: $t("errors.not-authorized") });
        const isRegistry = mode.data === "registry";
        const allowedGroups = await getShareableGroups(user.id, user.id);
        const groups =
            form.has("groupsProvided") || form.has("groups")
                ? [...new Set(form.getAll("groups").map(String))]
                : isRegistry
                  ? []
                  : allowedGroups.slice(0, 1).map(({ id }) => id);
        if (
            isRegistry
                ? groups.length > 0
                : !groups.length || groups.some((id) => !allowedGroups.some((group) => group.id === id))
        ) {
            return fail(422, { success: false, error: $t("wishes.invalid-list-groups") });
        }
        const groupId = isRegistry ? "global" : groups[0];
        const config = await getConfig(groupId);
        const properties = getListPropertiesSchema().safeParse({
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
        if (!properties.success)
            return fail(422, { success: false, formErrors: z.flattenError(properties.error).fieldErrors });
        if (!isRegistry && properties.data.public && !config.allowPublicLists) {
            return fail(400, { success: false, error: $t("errors.public-lists-not-allowed") });
        }
        if (!isRegistry && properties.data.allowSelfClaims && !config.claims.showForOwner) {
            return fail(400, { success: false, error: $t("errors.self-claims-not-available") });
        }
        let list;
        try {
            const data = {
                name: trimToNull(properties.data.name),
                icon: trimToNull(properties.data.icon),
                iconColor: trimToNull(properties.data.iconColor),
                description: trimToNull(properties.data.description)
            };
            if (isRegistry) list = await createRegistry(user.id, data, properties.data.managers ?? []);
            else {
                list = await create(
                    user.id,
                    groupId,
                    {
                        ...data,
                        public: properties.data.public,
                        hideOwner: properties.data.hideOwner,
                        allowSelfClaims: properties.data.allowSelfClaims,
                        notForMe: properties.data.notForMe
                    },
                    groups
                );
                await adjustListManagers(list.id, properties.data.managers);
            }
        } catch (err) {
            if (list) await client.list.delete({ where: { id: list.id } });
            if (err instanceof RegistryListError)
                return fail(422, { success: false, error: $t(`wishes.registry-${err.reason}`) });
            logger.error({ err }, "Unable to create list");
            return fail(500, { success: false, error: $t("errors.unable-to-create-list") });
        }
        redirect(302, resolve("/lists/[id]", { id: list.id }));
    }
};
