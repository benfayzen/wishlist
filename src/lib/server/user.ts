import { client } from "$lib/server/prisma";
import { Role } from "$lib/schema";
import { getConfig } from "$lib/server/config";
import type { User } from "$lib/generated/prisma/client";
import { init } from "@paralleldrive/cuid2";
import { consumeRegistration, type RegistrationContext } from "./registration-store";
import { isTokenTimeValid } from "./token";
import { hashPassword } from "./password";

interface UserMinimal extends Pick<User, "username" | "email" | "name"> {
    oauthId?: string | null;
}

export const createUser = async (
    user: UserMinimal,
    role: Role,
    password: string,
    signupTokenId?: string,
    registration?: RegistrationContext
) => {
    const config = await getConfig();
    const userCount = await client.user.count();

    let groupId = config.defaultGroup;
    if (signupTokenId) {
        groupId = await client.signupToken
            .findUnique({
                where: {
                    id: signupTokenId
                },
                select: {
                    groupId: true
                }
            })
            .then((data) => data?.groupId);
    } else if (userCount === 0) {
        groupId = (
            await client.group.findFirst({
                select: {
                    id: true
                }
            })
        )?.id;
    }
    const groupConfig = groupId ? await getConfig(groupId) : undefined;
    const hashedPassword = await hashPassword(password);
    return client.$transaction(async (tx) => {
        if (registration) await consumeRegistration(tx, registration, "account");
        if (signupTokenId) {
            const invite = await tx.signupToken.findUnique({ where: { id: signupTokenId } });
            if (!invite || invite.redeemed || !isTokenTimeValid(invite.createdAt))
                throw new Error("Invalid invitation");
            const redeemed = await tx.signupToken.updateMany({
                where: { id: signupTokenId, redeemed: false },
                data: { redeemed: true }
            });
            if (redeemed.count !== 1) throw new Error("Invitation already redeemed");
        }

        const newUser = await tx.user.create({
            select: {
                id: true
            },
            data: {
                username: user.username,
                name: user.name,
                email: user.email,
                roleId: role === Role.ADMIN && (await tx.user.count()) > 0 ? Role.USER : role,
                hashedPassword,
                oauthId: user.oauthId
            }
        });

        if (groupId) {
            const createList = groupConfig?.enableDefaultListCreation
                ? tx.list.create({ data: { id: init({ length: 10 })(), ownerId: newUser.id, groupId } })
                : Promise.resolve();
            await Promise.all([
                tx.userGroupMembership.create({
                    data: {
                        groupId: groupId,
                        userId: newUser.id,
                        active: true
                    }
                }),
                createList
            ]);
        }

        return newUser;
    });
};
