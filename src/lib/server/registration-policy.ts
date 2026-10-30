import { createHmac } from "node:crypto";
import ipaddr from "ipaddr.js";

export class RegistrationProtectionError extends Error {
    constructor(
        public readonly reason: "rate-limited" | "verification-failed" | "unavailable",
        public readonly retryAfter = 0
    ) {
        super(reason);
    }
}

export function registrationPolicy(env: Record<string, string | undefined>) {
    const enabled = (name: string, fallback: boolean) => {
        const value = env[name];
        if (value === undefined || value === "") return fallback;
        if (value !== "true" && value !== "false") throw new RegistrationProtectionError("unavailable");
        return value === "true";
    };
    const integer = (name: string, fallback: number, max = 86400) => {
        const raw = env[name];
        const value = raw === undefined || raw === "" ? fallback : Number(raw);
        if (!Number.isSafeInteger(value) || value < 1 || value > max)
            throw new RegistrationProtectionError("unavailable");
        return value;
    };
    const turnstile = enabled("TURNSTILE_ENABLED", false);
    let hostname = "";
    if (turnstile) {
        try {
            hostname = new URL(env.ORIGIN ?? "").hostname;
        } catch {
            /* checked below */
        }
        if (!hostname || !env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY)
            throw new RegistrationProtectionError("unavailable");
    }
    return {
        rateLimit: enabled("REGISTRATION_RATE_LIMIT_ENABLED", true),
        accountLimit: integer("REGISTRATION_ACCOUNT_LIMIT", 3, 10000),
        accountWindow: integer("REGISTRATION_ACCOUNT_WINDOW_SECONDS", 3600) * 1000,
        attemptLimit: integer("REGISTRATION_ATTEMPT_LIMIT", 10, 10000),
        attemptWindow: integer("REGISTRATION_ATTEMPT_WINDOW_SECONDS", 600) * 1000,
        ipv6Prefix: integer("REGISTRATION_IPV6_PREFIX", 64, 128),
        turnstile,
        hostname,
        siteKey: env.TURNSTILE_SITE_KEY ?? "",
        secretKey: env.TURNSTILE_SECRET_KEY ?? ""
    };
}
export type RegistrationPolicy = ReturnType<typeof registrationPolicy>;

export function registrationKey(address: string, secret: string, ipv6Prefix: number) {
    try {
        // process() also normalizes IPv4-mapped IPv6 addresses.
        const ip = ipaddr.process(address);
        const bytes = ip.toByteArray();
        if (ip.kind() === "ipv6") {
            for (let bit = ipv6Prefix; bit < 128; bit++) bytes[Math.floor(bit / 8)] &= ~(1 << (7 - (bit % 8)));
        }
        return createHmac("sha256", secret)
            .update(`${ip.kind()}:${bytes.join(".")}`)
            .digest("hex");
    } catch {
        throw new RegistrationProtectionError("unavailable");
    }
}

export async function verifyTurnstile(token: unknown, policy: RegistrationPolicy, fetcher: typeof fetch = fetch) {
    if (!policy.turnstile) return;
    if (typeof token !== "string" || !token || token.length > 2048)
        throw new RegistrationProtectionError("verification-failed");
    let result: { success?: boolean; hostname?: string; action?: string };
    try {
        const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: policy.secretKey, response: token }),
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error("Siteverify unavailable");
        result = await response.json();
        if (!result || typeof result !== "object") throw new Error("Invalid Siteverify response");
    } catch {
        throw new RegistrationProtectionError("unavailable");
    }
    if (result.success !== true || result.hostname !== policy.hostname || result.action !== "signup") {
        throw new RegistrationProtectionError("verification-failed");
    }
}
