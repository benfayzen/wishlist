import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { client } from "$lib/server/prisma";
import { getFormatter } from "$lib/server/i18n";
import { requireLogin } from "$lib/server/auth";

export const load: PageServerLoad = async ({ params }) => {
    const user = requireLogin();
    const $t = await getFormatter();

    const list = await client.list.findFirst({
        select: {
            id: true
        },
        where: {
            owner: {
                username: params.username
            },
            OR: [
                { ownerId: user.id },
                { public: true },
                { groupShares: { some: { group: { UserGroupMembership: { some: { userId: user.id } } } } } }
            ]
        },
        orderBy: { id: "asc" }
    });

    if (!list) {
        error(404, $t("errors.list-not-found"));
    }

    redirect(302, `/lists/${list.id}`);
};
