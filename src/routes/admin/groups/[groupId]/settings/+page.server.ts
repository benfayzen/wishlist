import { getConfig, writeConfig } from "$lib/server/config";
import { client } from "$lib/server/prisma";
import { fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { settingSchema } from "$lib/server/validations";
import { requireAdminOrManager } from "$lib/server/auth";
import z from "zod";

export const load = (async ({ params }) => {
    await requireAdminOrManager(params.groupId);

    const group = await client.group.findUniqueOrThrow({
        where: {
            id: params.groupId
        },
        select: {
            id: true
        }
    });

    const [membershipCount, listCount, config] = await Promise.all([
        client.userGroupMembership.count({
            where: {
                groupId: group.id
            }
        }),
        client.list.count({
            where: {
                groupId: group.id
            }
        }),
        getConfig(group.id)
    ]);

    return {
        config,
        membershipCount,
        listCount
    };
}) satisfies PageServerLoad;

export const actions: Actions = {
    default: async ({ request, params }) => {
        await requireAdminOrManager(params.groupId);

        const formData = Object.fromEntries(await request.formData());
        const groupSettingSchema = settingSchema.pick({
            suggestionMethod: true,
            enableSuggestions: true,
            claimsShowName: true,
            claimsShowNameAcrossGroups: true,
            claimsShowForOwner: true,
            claimsShowNamePublic: true,
            claimsRequireEmail: true,
            enableDefaultListCreation: true,
            allowPublicLists: true
        });

        const configData = groupSettingSchema.safeParse(formData);

        if (!configData.success) {
            return fail(400, { action: "settings", error: z.prettifyError(configData.error) });
        }

        const newConfig: Pick<
            Config,
            "suggestions" | "claims" | "listMode" | "enableDefaultListCreation" | "allowPublicLists"
        > = {
            suggestions: {
                enable: configData.data.enableSuggestions,
                method: configData.data.suggestionMethod
            },
            claims: {
                showName: configData.data.claimsShowName,
                showNameAcrossGroups: configData.data.claimsShowNameAcrossGroups,
                showForOwner: configData.data.claimsShowForOwner,
                showNamePublic: configData.data.claimsShowNamePublic,
                requireEmail: configData.data.claimsRequireEmail
            },
            listMode: "standard",
            enableDefaultListCreation: configData.data.enableDefaultListCreation,
            allowPublicLists: configData.data.allowPublicLists
        };

        await writeConfig(newConfig, params.groupId);

        return { success: true };
    }
};
