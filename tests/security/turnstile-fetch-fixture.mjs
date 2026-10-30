// Loaded only by the disposable HTTP test process with node --import.
// Production code has no switch that bypasses Siteverify.
const originalFetch = globalThis.fetch;
const spent = new Set();
globalThis.fetch = async (input, init) => {
    if (String(input) !== "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
        return originalFetch(input, init);
    }
    const { secret, response } = JSON.parse(init.body);
    const success = secret === "private-test-secret" && response.startsWith("accepted-") && !spent.has(response);
    spent.add(response);
    return Response.json({
        success,
        hostname: "127.0.0.1",
        action: "signup",
        "error-codes": success ? [] : ["timeout-or-duplicate"]
    });
};
