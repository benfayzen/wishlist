// Run after pnpm build. Uses a private temporary database and local server.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "../../src/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const password = "Register-Security!2026";
const repo = resolve(".");

test("registration protection HTTP and browser flows", { timeout: 180000 }, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "wishlist-registration-http-"));
    writeFileSync(join(dir, "test.db"), "");
    const database = `file:${join(dir, "test.db")}`;
    const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: database }) });
    let server: ChildProcess | undefined;
    let logs = "";
    const base = "http://127.0.0.1:4293";
    const stop = async () => {
        if (server && server.exitCode === null) {
            server.kill("SIGTERM");
            await once(server, "exit");
        }
        server = undefined;
    };
    const start = async (extra: Record<string, string> = {}) => {
        await stop();
        logs = "";
        server = spawn(
            process.execPath,
            ["--import", join(repo, "tests/security/turnstile-fetch-fixture.mjs"), join(repo, "build/index.js")],
            {
                cwd: dir,
                env: {
                    ...process.env,
                    DATABASE_URL: database,
                    HOST: "127.0.0.1",
                    PORT: "4293",
                    ORIGIN: base,
                    LOG_LEVEL: "error",
                    ADDRESS_HEADER: "X-Forwarded-For",
                    XFF_DEPTH: "1",
                    TURNSTILE_ENABLED: "false",
                    REGISTRATION_RATE_LIMIT_ENABLED: "true",
                    REGISTRATION_ACCOUNT_LIMIT: "3",
                    REGISTRATION_ACCOUNT_WINDOW_SECONDS: "3600",
                    REGISTRATION_ATTEMPT_LIMIT: "10",
                    REGISTRATION_ATTEMPT_WINDOW_SECONDS: "600",
                    ...extra
                },
                stdio: ["ignore", "pipe", "pipe"]
            }
        );
        server.stdout?.on("data", (chunk) => {
            logs += chunk;
        });
        server.stderr?.on("data", (chunk) => {
            logs += chunk;
        });
        for (let i = 0; i < 100; i++) {
            try {
                if ((await fetch(`${base}/login`, { redirect: "manual" })).status < 500) return;
            } catch {
                /* starting */
            }
            if (server.exitCode !== null) throw new Error(logs);
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error(`Server not ready: ${logs}`);
    };
    const signup = async (username: string, ip = "192.0.2.1", extra: Record<string, string> = {}) =>
        fetch(`${base}/signup`, {
            method: "POST",
            headers: { Origin: base, Accept: "application/json", "X-SvelteKit-Action": "true", "X-Forwarded-For": ip },
            body: new URLSearchParams({
                name: username,
                username,
                email: `${username}@example.com`,
                password,
                ...extra
            })
        });
    try {
        execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
            cwd: repo,
            env: { ...process.env, DATABASE_URL: database },
            stdio: "pipe"
        });
        await db.role.createMany({
            data: [
                { id: 1, name: "USER" },
                { id: 2, name: "ADMIN" },
                { id: 3, name: "GROUP_MANAGER" }
            ]
        });
        const group = await db.group.create({ data: { name: "Default" } });
        await start();
        let adminCookie = "";
        await t.test("first three signups succeed, fourth fails and state survives restart", async () => {
            for (const username of ["first-admin", "second", "third"]) {
                const response = await signup(username);
                assert.equal(response.status, 200, await response.text());
                if (!adminCookie) adminCookie = response.headers.get("set-cookie")!.split(";")[0];
            }
            const blocked = await signup("fourth");
            assert.equal(blocked.status, 429);
            assert.ok(Number(blocked.headers.get("retry-after")) > 0);
            assert.equal(await db.user.count(), 3);
            await start();
            assert.equal((await signup("fourth")).status, 429);
        });
        await t.test("failed account creation preserves successful quota and counters contain no raw IP", async () => {
            assert.equal((await (await signup("third", "192.0.2.2")).json()).status, 400);
            for (let i = 0; i < 3; i++) assert.equal((await signup(`other-${i}`, "192.0.2.2")).status, 200);
            assert.equal((await signup("other-fourth", "192.0.2.2")).status, 429);
            const records = await db.registrationEvent.findMany();
            assert.ok(records.every((record) => /^[a-f0-9]{64}$/.test(record.key)));
        });
        await t.test("concurrent HTTP registrations cannot exceed three accounts", async () => {
            const responses = await Promise.all(
                Array.from({ length: 6 }, (_, i) => signup(`parallel-${i}`, "192.0.2.9"))
            );
            assert.equal(responses.filter((response) => response.status === 200).length, 3);
            assert.equal(responses.filter((response) => response.status === 429).length, 3);
            assert.equal(await db.user.count({ where: { username: { startsWith: "parallel-" } } }), 3);
        });
        await t.test("automatic account lists keep their group share", async () => {
            await db.systemConfig.createMany({
                data: [
                    { key: "defaultGroup", groupId: "global", value: group.id },
                    { key: "enableDefaultListCreation", groupId: "global", value: "true" }
                ]
            });
            try {
                const response = await signup("automatic-list-user", "192.0.2.10");
                assert.equal(response.status, 200, await response.text());
                const user = await db.user.findUniqueOrThrow({
                    where: { username: "automatic-list-user" },
                    include: { lists: { include: { groupShares: true } } }
                });
                assert.equal(user.lists.length, 1);
                assert.deepEqual(
                    user.lists[0].groupShares.map((share) => share.groupId),
                    [group.id]
                );
            } finally {
                await db.systemConfig.deleteMany({
                    where: { groupId: "global", key: { in: ["defaultGroup", "enableDefaultListCreation"] } }
                });
            }
        });
        await t.test("invalid requests consume attempt quota independently", async () => {
            for (let i = 0; i < 10; i++)
                assert.equal((await (await signup("", "192.0.2.3", { password: "" })).json()).status, 400);
            const response = await signup("attempt-blocked", "192.0.2.3");
            assert.equal(response.status, 429);
            assert.ok(Number(response.headers.get("retry-after")) <= 600);
        });
        await t.test("existing login and admin creation remain available after quota exhaustion", async () => {
            const login = await fetch(`${base}/login`, {
                method: "POST",
                headers: {
                    Origin: base,
                    Accept: "application/json",
                    "X-SvelteKit-Action": "true",
                    "X-Forwarded-For": "192.0.2.1"
                },
                body: new URLSearchParams({ username: "first-admin", password })
            });
            assert.equal(login.status, 200);
            assert.ok(login.headers.get("set-cookie"));
            const response = await fetch(`${base}/api/users`, {
                method: "PUT",
                headers: {
                    Origin: base,
                    Cookie: adminCookie,
                    "Content-Type": "application/json",
                    "X-Forwarded-For": "192.0.2.1"
                },
                body: JSON.stringify({
                    username: "admin-created",
                    name: "Admin created",
                    email: "admin-created@example.com",
                    password
                })
            });
            assert.equal(response.status, 201, await response.text());
        });
        await t.test("trusted-header registrations share the quota but existing identities still log in", async () => {
            await start({
                HEADER_AUTH_ENABLED: "true",
                HEADER_USERNAME: "X-Test-Username",
                HEADER_EMAIL: "X-Test-Email",
                HEADER_NAME: "X-Test-Name"
            });
            const proxyLogin = (username: string) =>
                fetch(`${base}/login`, {
                    redirect: "manual",
                    headers: {
                        "X-Forwarded-For": "203.0.113.1",
                        "X-Test-Username": username,
                        "X-Test-Email": `${username}@example.com`,
                        "X-Test-Name": username
                    }
                });
            for (let i = 0; i < 3; i++) assert.equal((await proxyLogin(`proxy-${i}`)).status, 302);
            assert.equal((await proxyLogin("proxy-blocked")).status, 429);
            assert.equal((await proxyLogin("proxy-0")).status, 302);
            await start();
        });
        await t.test("invite-only requires original secret and consumes it once", async () => {
            await db.systemConfig.upsert({
                where: { key_groupId: { key: "enableSignup", groupId: "global" } },
                create: { key: "enableSignup", groupId: "global", value: "false" },
                update: { value: "false" }
            });
            const token = "disposable-invitation-secret";
            const invite = await db.signupToken.create({
                data: { groupId: group.id, hashedToken: createHash("sha3-256").update(token).digest("hex") }
            });
            assert.equal((await signup("invite-user", "192.0.2.4", { tokenId: invite.id })).status, 400);
            const response = await signup("invite-user", "192.0.2.4", { tokenId: invite.id, signupToken: token });
            assert.equal(response.status, 200, await response.text());
            assert.equal(
                (await signup("invite-replay", "192.0.2.4", { tokenId: invite.id, signupToken: token })).status,
                400
            );
            await db.systemConfig.update({
                where: { key_groupId: { key: "enableSignup", groupId: "global" } },
                data: { value: "true" }
            });
        });
        await t.test("browser layout, form retention and Turnstile expiry/retry", async () => {
            await start({
                TURNSTILE_ENABLED: "true",
                TURNSTILE_SITE_KEY: "public-test-site",
                TURNSTILE_SECRET_KEY: "private-test-secret"
            });
            assert.equal((await signup("missing-captcha", "192.0.2.5")).status, 400);
            const browser = await chromium.launch();
            try {
                for (const width of [320, 1440]) {
                    const context = await browser.newContext({
                        viewport: { width, height: 1000 },
                        locale: "de-DE",
                        extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.6" }
                    });
                    const page = await context.newPage();
                    const errors: string[] = [];
                    page.on("pageerror", (err) => errors.push(err.stack ?? err.message));
                    page.on("requestfailed", (request) =>
                        errors.push(`${request.url()}: ${request.failure()?.errorText}`)
                    );
                    await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", (route) =>
                        route.fulfill({
                            contentType: "application/javascript",
                            body: `
                        window.widgetRenders = 0;
                        window.turnstile = {
                            render(element, options) { window.widgetOptions = options; window.widgetRenders++; element.textContent = 'Verification test'; return 'test-widget'; },
                            remove() {}
                        };
                    `
                        })
                    );
                    await page.goto(`${base}/signup`);
                    try {
                        await expect.poll(() => page.evaluate("window.widgetRenders"), { timeout: 15000 }).toBe(1);
                    } catch (err) {
                        throw new Error(
                            JSON.stringify({ errors, url: page.url(), body: await page.locator("body").innerText() }),
                            { cause: err }
                        );
                    }
                    await page.locator("#name").fill("Browser test");
                    await page.locator("#username").fill("browser-test");
                    await page.locator("#email").fill("invalid");
                    await page.locator("#password").fill(password);
                    await page.locator("#confirmpassword").fill(password);
                    const button = page.locator('button[type="submit"]');
                    await expect(button).toBeDisabled();
                    await page.evaluate("window.widgetOptions.callback('dummy-token')");
                    await expect(button).toBeEnabled();
                    await page.evaluate("window.widgetOptions['expired-callback']()");
                    await expect(button).toBeDisabled();
                    await page.evaluate("window.widgetOptions.callback('fresh-token')");
                    // Submit a server-side validation error without invoking the provider.
                    await page.locator("#email").fill("browser@example.com");
                    await page.locator("#name").fill(" ");
                    await button.click();
                    await expect.poll(() => page.evaluate("window.widgetRenders")).toBe(2);
                    await expect(button).toBeDisabled();
                    await expect(page.locator("#username")).toHaveValue("browser-test");
                    await page.evaluate("window.widgetOptions['error-callback']()");
                    await expect(page.getByRole("alert")).toBeVisible();
                    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                    assert.deepEqual(errors, []);
                    await page.locator("#name").fill("Browser test");
                    await page.locator("#username").fill(`browser-${width}`);
                    await page.locator("#email").fill(`browser-${width}@example.com`);
                    await page.evaluate(`window.widgetOptions.callback('accepted-${width}')`);
                    const submitted = page.waitForResponse(
                        (response) => response.url().endsWith("/signup") && response.request().method() === "POST"
                    );
                    await button.click();
                    assert.equal((await submitted).status(), 200);
                    assert.ok(await db.user.findUnique({ where: { username: `browser-${width}` } }));
                    // Simulate a spent provider token. No second account may be created.
                    assert.equal(
                        (await signup(`replay-${width}`, "192.0.2.8", { "cf-turnstile-response": `accepted-${width}` }))
                            .status,
                        400
                    );
                    assert.equal(await db.user.findUnique({ where: { username: `replay-${width}` } }), null);
                    await context.close();
                }
            } finally {
                await browser.close();
            }
            const response = await fetch(`${base}/signup`);
            const html = await response.text();
            assert.ok(!html.includes("private-test-secret"));
            await start({ TURNSTILE_ENABLED: "true", TURNSTILE_SITE_KEY: "", TURNSTILE_SECRET_KEY: "" });
            assert.equal((await signup("misconfigured", "192.0.2.7")).status, 503);
        });
    } finally {
        await stop();
        await db.$disconnect();
        rmSync(dir, { recursive: true, force: true });
    }
});
