import { env } from "$env/dynamic/private";
import {
    registrationAttempt,
    registrationError,
    RegistrationProtectionError,
    verifyTurnstile,
    registrationPolicy,
    publicRegistrationProtection
} from "$lib/server/registration";
import { createSession, generateSessionToken, setSessionTokenCookie } from "$lib/server/auth";
import { client } from "$lib/server/prisma";
import { getSignupSchema } from "$lib/server/validations";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { hashToken, isTokenTimeValid } from "$lib/server/token";
import { getConfig } from "$lib/server/config";
import { createUser } from "$lib/server/user";
import { Role } from "$lib/schema";
import { getFormatter } from "$lib/server/i18n";
import { logger } from "$lib/server/logger";
import z from "zod";

export const load: PageServerLoad = async (event) => {
    const { locals, url } = event;
    const turnstile = await publicRegistrationProtection(event);
    if (locals.user) redirect(302, url.searchParams.get("redirectTo") ?? "/");

    const $t = await getFormatter();
    const config = await getConfig();

    const token = url.searchParams.get("token");
    if (token) {
        const signup = await client.signupToken.findFirst({
            where: {
                hashedToken: hashToken(token),
                redeemed: false
            },
            select: {
                id: true,
                createdAt: true
            }
        });

        if (!signup) error(400, $t("errors.invite-code-invalid"));

        if (isTokenTimeValid(signup.createdAt)) {
            return { valid: true, id: signup.id, signupToken: token, turnstile };
        }
        error(400, $t("errors.invite-code-invalid"));
    }
    if (!config.enableSignup) {
        error(401, $t("errors.this-instance-is-invite-only"));
    }
    return { turnstile };
};

export const actions: Actions = {
    default: async (event) => {
        const { request, cookies } = event;
        let registration;
        try {
            registration = await registrationAttempt(event);
        } catch (err) {
            const failure = await registrationError(err, event);
            return fail(failure.status, { error: true, message: failure.message });
        }
        const formData = Object.fromEntries(await request.formData());
        const signupSchema = await getSignupSchema();
        const signupData = signupSchema.safeParse(formData);
        const $t = await getFormatter();

        // check for empty values
        if (!signupData.success) {
            return fail(400, { error: true, errors: z.flattenError(signupData.error).fieldErrors });
        }

        const config = await getConfig();

        if (!config.enableSignup || signupData.data.tokenId) {
            if (!signupData.data.tokenId) {
                error(401, $t("errors.this-instance-is-invite-only"));
            }
            const signup = await client.signupToken.findUnique({
                where: {
                    id: signupData.data.tokenId
                },
                select: {
                    createdAt: true,
                    redeemed: true
                }
            });

            const proof =
                typeof formData.signupToken === "string" && formData.signupToken
                    ? await client.signupToken.findFirst({
                          where: { id: signupData.data.tokenId, hashedToken: hashToken(formData.signupToken) }
                      })
                    : null;
            if (!signup || !proof || signup.redeemed || !isTokenTimeValid(signup.createdAt)) {
                error(400, $t("errors.invite-code-invalid"));
            }
        }

        const userCount = await client.user.count();
        try {
            await verifyTurnstile(formData["cf-turnstile-response"], registrationPolicy(env));
            const user = await createUser(
                {
                    username: signupData.data.username,
                    email: signupData.data.email,
                    name: signupData.data.name
                },
                userCount > 0 ? Role.USER : Role.ADMIN,
                signupData.data.password,
                signupData.data.tokenId,
                registration
            );

            const sessionToken = generateSessionToken();
            const session = await createSession(sessionToken, user.id);
            setSessionTokenCookie(cookies, sessionToken, session.expiresAt);
            return { success: true };
        } catch (err) {
            if (err instanceof RegistrationProtectionError) {
                const failure = await registrationError(err, event);
                return fail(failure.status, { error: true, message: failure.message });
            }
            logger.error({ err }, "User with username or email already exists");
            return fail(400, {
                error: true,
                message: $t("errors.user-already-exists")
            });
        }
    }
};
