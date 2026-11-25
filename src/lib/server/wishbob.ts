import { gotScraping } from "got-scraping";
import { env } from "$env/dynamic/private";
import { getSafeUrl } from "$lib/server/safeurl";
import { logger as baseLogger } from "$lib/server/logger";
import {
    isWishbobHost,
    parseWishbobHtml,
    parseWishbobUrlInput,
    WishbobImportError,
    type WishbobParsedList
} from "./wishbob-parser";

export * from "./wishbob-parser";

const logger = baseLogger.child({}, { msgPrefix: "[WISHBOB] " });

export async function validateWishbobUrl(rawUrl: string): Promise<URL> {
    const parsed = parseWishbobUrlInput(rawUrl);
    if (!parsed) {
        throw new WishbobImportError("invalid-url", "Not a valid Wishbob wishlist URL");
    }

    const safeUrl = await getSafeUrl(parsed);
    if (!safeUrl) {
        throw new WishbobImportError("invalid-url", "URL resolved to a non-public address");
    }

    return safeUrl;
}

function determineProxy(url: URL): string | undefined {
    if (url.protocol === "http:") {
        return env.http_proxy || env.HTTP_PROXY;
    }
    if (url.protocol === "https:") {
        return env.https_proxy || env.HTTPS_PROXY;
    }
    return undefined;
}

export async function fetchWishbobList(rawUrl: string, locales: string[] = ["de", "en"]): Promise<WishbobParsedList> {
    const targetUrl = await validateWishbobUrl(rawUrl);

    let html: string;
    let resolvedUrl: string;
    try {
        const resp = await gotScraping({
            url: targetUrl,
            proxyUrl: determineProxy(targetUrl),
            headerGeneratorOptions: {
                devices: ["desktop"],
                locales
            },
            hooks: {
                beforeRedirect: [
                    async (options) => {
                        if (options.url) {
                            const redirectUrl = new URL(options.url.toString());
                            if (!isWishbobHost(redirectUrl.hostname)) {
                                throw new Error("Redirect left Wishbob host");
                            }
                            const safeUrl = await getSafeUrl(redirectUrl);
                            if (safeUrl === null) {
                                throw new Error("The resolved IP of the domain is reserved");
                            }
                            options.url = safeUrl;
                        }
                    }
                ]
            }
        });

        if (resp.statusCode < 200 || resp.statusCode >= 300) {
            logger.warn({ url: targetUrl.toString(), statusCode: resp.statusCode }, "Wishbob returned non-2xx status");
            throw new WishbobImportError("fetch-failed", `Wishbob returned status ${resp.statusCode}`);
        }

        html = resp.body;
        resolvedUrl = resp.url || targetUrl.toString();
    } catch (err) {
        if (err instanceof WishbobImportError) {
            throw err;
        }
        logger.error({ err, url: targetUrl.toString() }, "Failed to fetch Wishbob wishlist");
        throw new WishbobImportError("fetch-failed", "Unable to fetch Wishbob wishlist");
    }

    const parsed = parseWishbobHtml(html, resolvedUrl);
    if (parsed.items.length === 0) {
        throw new WishbobImportError("empty-list", "No wishes found on this Wishbob page");
    }

    return parsed;
}
