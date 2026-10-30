import { randomBytes } from "node:crypto";
import { env } from "$env/dynamic/private";
import { error, type RequestEvent } from "@sveltejs/kit";
import { client } from "./prisma";
import { getFormatter } from "./i18n";
import { logger } from "./logger";
import { registrationKey, registrationPolicy, RegistrationProtectionError } from "./registration-policy";
import { consumeRegistration, type RegistrationContext } from "./registration-store";

export { registrationPolicy, RegistrationProtectionError, verifyTurnstile } from "./registration-policy";

export async function registrationAttempt(event: RequestEvent): Promise<RegistrationContext | undefined> {
    const policy = registrationPolicy(env);
    if (!policy.rateLimit) return;
    // Kept out of getConfig(): this secret must never be serialized to a page.
    const secret =
        env.REGISTRATION_IP_HASH_SECRET ||
        (
            await client.systemConfig.upsert({
                where: { key_groupId: { key: "security.registrationHashSecret", groupId: "global" } },
                create: {
                    key: "security.registrationHashSecret",
                    groupId: "global",
                    value: randomBytes(32).toString("hex")
                },
                update: {}
            })
        ).value;
    if (!secret) throw new RegistrationProtectionError("unavailable");
    const context = { key: registrationKey(event.getClientAddress(), secret, policy.ipv6Prefix), policy };
    await client.$transaction((tx) => consumeRegistration(tx, context, "attempt"));
    return context;
}

export async function registrationError(err: unknown, event: RequestEvent) {
    if (!(err instanceof RegistrationProtectionError)) throw err;
    event.locals.registrationStatus = err.reason === "rate-limited" ? 429 : err.reason === "unavailable" ? 503 : 400;
    const t = await getFormatter();
    if (err.reason === "rate-limited") {
        event.setHeaders({ "Retry-After": String(err.retryAfter) });
        return {
            status: 429 as const,
            message: t("errors.registration-rate-limited", { values: { minutes: Math.ceil(err.retryAfter / 60) } })
        };
    }
    if (err.reason === "unavailable") {
        logger.warn("Registration protection unavailable; registration rejected");
        return { status: 503 as const, message: t("errors.registration-protection-unavailable") };
    }
    return { status: 400 as const, message: t("errors.registration-verification-failed") };
}

export async function rejectRegistration(err: unknown, event: RequestEvent): Promise<never> {
    const failure = await registrationError(err, event);
    error(failure.status, failure.message);
}

export async function publicRegistrationProtection(event: RequestEvent) {
    try {
        const policy = registrationPolicy(env);
        return { enabled: policy.turnstile, siteKey: policy.turnstile ? policy.siteKey : "" };
    } catch (err) {
        return rejectRegistration(err, event);
    }
}
