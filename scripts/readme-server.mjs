import { createServer } from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = resolve(root, "data/readme-demo");
const port = 4183;
// Refuse a port collision before touching even the dedicated demo database.
await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});
const seed = spawnSync(process.execPath, ["--import", "tsx", "prisma/seed-readme.ts"], {
    cwd: root,
    env: process.env,
    stdio: "inherit"
});
if (seed.status !== 0) process.exit(seed.status ?? 1);
const server = spawn(process.execPath, [resolve(root, "build/index.js")], {
    cwd: runtime,
    env: {
        ...process.env,
        DATABASE_URL: `file:${resolve(runtime, "wishlist.db")}`,
        ORIGIN: `http://127.0.0.1:${port}`,
        HOST: "127.0.0.1",
        PORT: String(port),
        DEFAULT_CURRENCY: "USD",
        LOG_LEVEL: "warn"
    },
    stdio: "inherit"
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
