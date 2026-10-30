import { requireLogin } from "$lib/server/auth";
import { client } from "$lib/server/prisma";
import { Role } from "$lib/schema";
import { getConfig } from "$lib/server/config";
import { getFormatter } from "$lib/server/i18n";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    const user = requireLogin();
    const memberships = await client.userGroupMembership.findMany({
        where: { userId: user.id },
        select: {
            id: true,
            roleId: true,
            group: {
                select: {
                    id: true,
                    name: true,
                    UserGroupMembership: { where: { roleId: Role.GROUP_MANAGER }, select: { userId: true } }
                }
            }
        },
        orderBy: { group: { name: "asc" } }
    });
    return {
        memberships: memberships.map(({ group, ...membership }) => ({
            ...membership,
            group: { id: group.id, name: group.name },
            canManage: user.roleId === Role.ADMIN || membership.roleId === Role.GROUP_MANAGER,
            canLeave: membership.roleId !== Role.GROUP_MANAGER || group.UserGroupMembership.length > 1
        }))
    };
};

export const actions: Actions = {
    create: async ({ request }) => {
        const user = requireLogin();
        const $t = await getFormatter();
        const name = (await request.formData()).get("name");
        if (typeof name !== "string" || name.trim().length < 3 || name.trim().length > 32) {
            return fail(422, { message: $t("groups.invalid-name") });
        }
        if (await client.group.findUnique({ where: { name: name.trim() }, select: { id: true } })) {
            return fail(409, { message: $t("groups.name-taken") });
        }
        const config = await getConfig();
        const group = await client.$transaction(async (tx) => {
            const created = await tx.group.create({
                data: {
                    name: name.trim(),
                    UserGroupMembership: { create: { userId: user.id, roleId: Role.GROUP_MANAGER } }
                }
            });
            if (config.enableDefaultListCreation)
                await tx.list.create({
                    data: {
                        ownerId: user.id,
                        groupId: created.id,
                        groupShares: { create: { groupId: created.id } }
                    }
                });
            return created;
        });
        redirect(303, `/admin/groups/${group.id}`);
    },
    leave: async ({ request }) => {
        const user = requireLogin();
        const $t = await getFormatter();
        const groupId = (await request.formData()).get("groupId");
        if (typeof groupId !== "string") return fail(422, { message: $t("errors.not-authorized") });
        const result = await client.$transaction(async (tx) => {
            const membership = await tx.userGroupMembership.findFirst({ where: { userId: user.id, groupId } });
            if (!membership) return "forbidden";
            if (
                membership.roleId === Role.GROUP_MANAGER &&
                (await tx.userGroupMembership.count({
                    where: { groupId, roleId: Role.GROUP_MANAGER }
                })) < 2
            )
                return "last-manager";
            await tx.listGroupShare.deleteMany({ where: { groupId, list: { ownerId: user.id } } });
            await tx.userGroupMembership.delete({ where: { id: membership.id } });
            return "ok";
        });
        if (result !== "ok")
            return fail(result === "forbidden" ? 403 : 409, {
                message: $t(result === "forbidden" ? "errors.not-authorized" : "groups.last-manager")
            });
        redirect(303, "/account/groups");
    }
};
