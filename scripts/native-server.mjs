import { createServer } from "node:net";
import { spawnSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, openSync, closeSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testing = process.argv.includes("--test");
const port = testing ? 4280 : 4173;
const runtime = resolve(root, "data", testing ? "m3-tests" : "m3-preview");
// Check binding directly before touching test data. HTTP probes of closed ports may stall in WSL.
await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});
// Only this dedicated test directory may be reset. The explicit database URL overrides dotenv; Docker is never invoked.
if (testing) rmSync(runtime, { recursive: true, force: true });
mkdirSync(resolve(runtime, "uploads"), { recursive: true });
cpSync(resolve(root, "templates"), resolve(runtime, "templates"), { recursive: true });
// This Prisma/SQLite engine requires an existing file when deploying into a new absolute path.
closeSync(openSync(resolve(runtime, "wishlist.db"), "a"));
const env = {
    ...process.env,
    DATABASE_URL: `file:${resolve(runtime, "wishlist.db")}`,
    // Keep the browser URL and server origin identical; CSRF checks remain enabled.
    ORIGIN: testing ? `http://127.0.0.1:${port}` : `http://localhost:${port}`,
    HOST: "127.0.0.1",
    PORT: String(port),
    LOG_LEVEL: "warn"
};
for (const [command, args] of [
    ["pnpm", ["exec", "prisma", "migrate", "deploy"]],
    [process.execPath, ["--import", "tsx", "prisma/seed.ts"]]
]) {
    const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!testing) console.log(`Native preview: ${env.ORIGIN}`);
const server = spawn(process.execPath, [resolve(root, "build/index.js")], { cwd: runtime, env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
