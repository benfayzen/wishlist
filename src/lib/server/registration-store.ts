import type { Prisma } from "$lib/generated/prisma/client";
import { RegistrationProtectionError, type RegistrationPolicy } from "./registration-policy";

export interface RegistrationContext {
    key: string;
    policy: RegistrationPolicy;
}

// Run in a transaction. The first statement acquires SQLite's write lock before
// counting, so concurrent registrations cannot both claim the final slot.
export async function consumeRegistration(
    tx: Prisma.TransactionClient,
    context: RegistrationContext,
    kind: "attempt" | "account",
    now = new Date()
) {
    await tx.registrationEvent.deleteMany({ where: { expiresAt: { lte: now } } });
    const limit = kind === "attempt" ? context.policy.attemptLimit : context.policy.accountLimit;
    const window = kind === "attempt" ? context.policy.attemptWindow : context.policy.accountWindow;
    const recent = await tx.registrationEvent.findMany({
        where: { key: context.key, kind, createdAt: { gt: new Date(now.getTime() - window) } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true }
    });
    if (recent.length >= limit) {
        const retryAt = recent[recent.length - limit].createdAt.getTime() + window;
        throw new RegistrationProtectionError("rate-limited", Math.max(1, Math.ceil((retryAt - now.getTime()) / 1000)));
    }
    await tx.registrationEvent.create({
        data: { key: context.key, kind, createdAt: now, expiresAt: new Date(now.getTime() + window) }
    });
}
