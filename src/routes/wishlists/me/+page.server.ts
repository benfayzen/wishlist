import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireLogin } from "$lib/server/auth";
import { client } from "$lib/server/prisma";
import { getConfig } from "$lib/server/config";

export const load: PageServerLoad = async () => {
    const user = requireLogin();
    const lists = await client.list.findMany({ where: { ownerId: user.id }, select: { id: true, groupId: true } });
    if (lists.length === 1 && (await getConfig(lists[0].groupId)).listMode === "registry") {
        redirect(302, `/lists/${lists[0].id}`);
    }
    redirect(302, `/lists?users=${user.id}`);
};
