import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "../../src/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
    registrationKey,
    registrationPolicy,
    RegistrationProtectionError,
    verifyTurnstile
} from "../../src/lib/server/registration-policy";
import { consumeRegistration } from "../../src/lib/server/registration-store";

const policy = registrationPolicy({});
const context = { key: "test-network", policy };
const limited = (err: unknown) => err instanceof RegistrationProtectionError && err.reason === "rate-limited";

test("defaults and invalid configuration fail closed", () => {
    assert.equal(policy.accountLimit, 3);
    assert.equal(policy.attemptLimit, 10);
    assert.equal(policy.turnstile, false);
    for (const env of [
        { REGISTRATION_ACCOUNT_LIMIT: "NaN" },
        { REGISTRATION_ACCOUNT_WINDOW_SECONDS: "0" },
        { TURNSTILE_ENABLED: "true" },
        { REGISTRATION_RATE_LIMIT_ENABLED: "yes" }
    ]) {
        assert.throws(() => registrationPolicy(env), RegistrationProtectionError);
    }
});

test("IP normalization, keyed hashes and IPv6 prefixes prevent trivial quota bypasses", () => {
    const key = (ip: string, secret = "secret") => registrationKey(ip, secret, 64);
    assert.equal(key("192.0.2.1"), key("::ffff:192.0.2.1"));
    assert.equal(key("2001:db8:1:2::1"), key("2001:0db8:0001:0002:ffff::abcd"));
    assert.notEqual(key("2001:db8:1:2::1"), key("2001:db8:1:3::1"));
    assert.notEqual(key("192.0.2.1"), key("192.0.2.1", "other-secret"));
    assert.throws(() => key("unknown"), RegistrationProtectionError);
});

const turnstile = registrationPolicy({
    TURNSTILE_ENABLED: "true",
    TURNSTILE_SITE_KEY: "public",
    TURNSTILE_SECRET_KEY: "private",
    ORIGIN: "https://wishlist.example"
});
const fetchResult = (data: unknown, status = 200) =>
    (async () => new Response(JSON.stringify(data), { status })) as typeof fetch;

test("Turnstile checks success, hostname and signup action", async () => {
    await verifyTurnstile(
        "token",
        turnstile,
        fetchResult({ success: true, hostname: "wishlist.example", action: "signup" })
    );
    for (const data of [
        null,
        { success: false },
        { success: true, hostname: "evil.example", action: "signup" },
        { success: true, hostname: "wishlist.example", action: "login" },
        { success: true }
    ]) {
        await assert.rejects(verifyTurnstile("token", turnstile, fetchResult(data)), RegistrationProtectionError);
    }
    for (const token of ["", undefined, "x".repeat(2049)]) {
        await assert.rejects(
            verifyTurnstile(token, turnstile, fetchResult({ success: true })),
            RegistrationProtectionError
        );
    }
    await assert.rejects(
        verifyTurnstile("token", turnstile, fetchResult({}, 503)),
        (err) => err instanceof RegistrationProtectionError && err.reason === "unavailable"
    );
    await assert.rejects(
        verifyTurnstile("token", turnstile, (async () => {
            throw new Error("Network down");
        }) as typeof fetch),
        RegistrationProtectionError
    );
    await verifyTurnstile(undefined, policy, (async () => {
        throw new Error("Must not call provider when disabled");
    }) as typeof fetch);
});

test("SQLite quotas survive reconnects, roll back failures, expire and serialize concurrent requests", async () => {
    const dir = mkdtempSync(join(tmpdir(), "wishlist-registration-"));
    const url = `file:${join(dir, "test.db")}`;
    const sql = new DatabaseSync(join(dir, "test.db"));
    sql.exec(
        readFileSync(
            new URL("../../prisma/migrations/20261029120000_registration_protection/migration.sql", import.meta.url),
            "utf8"
        )
    );
    sql.close();
    let db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
    const now = new Date("2026-10-29T12:00:00Z");
    try {
        const consume = (kind: "attempt" | "account", time = now) =>
            db.$transaction((tx) => consumeRegistration(tx, context, kind, time));
        await assert.rejects(
            db.$transaction(async (tx) => {
                await consumeRegistration(tx, context, "account", now);
                throw new Error("Account creation failed");
            })
        );
        assert.equal(await db.registrationEvent.count(), 0);
        const results = await Promise.allSettled(Array.from({ length: 6 }, () => consume("account")));
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
        for (const result of results) if (result.status === "rejected") assert.ok(limited(result.reason));
        await db.$disconnect();
        db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
        await assert.rejects(consume("account"), limited);
        // Failed attempts have their own quota and do not consume successful-account slots.
        for (let i = 0; i < 10; i++) await consume("attempt");
        await assert.rejects(consume("attempt"), limited);
        await db.$transaction((tx) => consumeRegistration(tx, { ...context, key: "other-network" }, "account", now));
        await consume("account", new Date(now.getTime() + policy.accountWindow));
        assert.equal(await db.registrationEvent.count(), 1);
    } finally {
        await db.$disconnect();
        rmSync(dir, { recursive: true, force: true });
    }
});
