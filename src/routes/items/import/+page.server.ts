import { requireLogin, requireLoginOrError } from "$lib/server/auth";
import { client } from "$lib/server/prisma";
import z from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export const load: PageServerLoad = async ({ url }) => {
    const user = requireLogin();

    const productUrl = url.searchParams.get("url");
    const productText = url.searchParams.get("text");
    const productTitle = url.searchParams.get("title");

    const lists = await client.list.findMany({
        select: {
            id: true,
            name: true,
            icon: true,
            groupId: true,
            owner: {
                select: {
                    name: true
                }
            }
        },
        where: {
            OR: [
                { ownerId: user.id, listMode: "standard" },
                { listMode: "registry", managers: { some: { userId: user.id } } }
            ]
        }
    });

    return {
        lists: lists.map((list) => ({ ...list, owner: list.owner ?? { name: "Registry" } })),
        url: productUrl || extractUrl(productText) || extractUrl(productTitle)
    };
};

export const actions: Actions = {
    default: async ({ request }) => {
        const user = await requireLoginOrError();

        const schema = z.object({
            list: z.string(),
            url: z.string()
        });

        const result = await request.formData().then(Object.fromEntries).then(schema.safeParseAsync);

        if (result.error) {
            return fail(422, z.flattenError(result.error).fieldErrors);
        }

        const selectedList = await client.list.findFirst({
            where: {
                id: result.data.list,
                OR: [
                    { ownerId: user.id, listMode: "standard" },
                    { listMode: "registry", managers: { some: { userId: user.id } } }
                ]
            },
            select: { id: true }
        });
        if (!selectedList) return fail(403, { list: ["Not authorized"] });

        const createItemRoute = resolve("/lists/[id]/create-item", { id: result.data.list });
        return redirect(
            303,
            createItemRoute + "?" + new URLSearchParams({ productUrl: result.data.url, redirectTo: "/lists" })
        );
    }
};

function extractUrl(url: string | undefined | null) {
    if (!url) {
        return null;
    }
    const urlRegex = /(https?):\/\/[^\s/$.?#].[^\s]*/;
    const matches = url.match(urlRegex);
    if (matches) {
        return matches[0];
    }
    return null;
}
