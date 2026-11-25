const WISHBOB_HOSTS = new Set(["wishbob.com", "www.wishbob.com"]);

const CURRENCY_SYMBOLS: Record<string, string> = {
    "€": "EUR",
    $: "USD",
    "£": "GBP",
    "¥": "JPY",
    "₹": "INR",
    "₩": "KRW",
    "₽": "RUB",
    zł: "PLN",
    kr: "SEK"
};

const NAMED_HTML_ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    euro: "€",
    pound: "£",
    copy: "©",
    reg: "®",
    trade: "™",
    times: "×",
    plusmn: "±",
    auml: "ä",
    ouml: "ö",
    uuml: "ü",
    Auml: "Ä",
    Ouml: "Ö",
    Uuml: "Ü",
    szlig: "ß",
    bdquo: "„",
    ldquo: "“",
    rdquo: "”",
    lsquo: "‘",
    rsquo: "’",
    laquo: "«",
    raquo: "»"
};

export interface WishbobParsedPrice {
    value: number;
    currency: string;
    raw: string;
}

export interface WishbobItem {
    externalId: string;
    name: string;
    url: string | null;
    note: string | null;
    imageUrl: string | null;
    price: WishbobParsedPrice | null;
    fulfilled: boolean;
    inactive: boolean;
    mostWanted: boolean;
}

export interface WishbobParsedList {
    sourceUrl: string;
    listTitle: string | null;
    items: WishbobItem[];
}

export class WishbobImportError extends Error {
    code: "invalid-url" | "fetch-failed" | "empty-list";

    constructor(code: "invalid-url" | "fetch-failed" | "empty-list", message: string) {
        super(message);
        this.name = "WishbobImportError";
        this.code = code;
    }
}

export function decodeHtmlEntities(input: string): string {
    return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
        if (entity.startsWith("#x") || entity.startsWith("#X")) {
            const codePoint = Number.parseInt(entity.slice(2), 16);
            return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
        }
        if (entity.startsWith("#")) {
            const codePoint = Number.parseInt(entity.slice(1), 10);
            return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
        }
        return NAMED_HTML_ENTITIES[entity] ?? match;
    });
}

function stripTags(input: string): string {
    return input
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/[ \t\r\f\v]+/g, " ")
        .replace(/\n\s+/g, "\n")
        .replace(/\s+\n/g, "\n")
        .trim();
}

function normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, " ").trim();
}

export function isWishbobHost(hostname: string): boolean {
    return WISHBOB_HOSTS.has(hostname.toLowerCase());
}

export function parseWishbobUrlInput(rawUrl: string): URL | null {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return null;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const parsed = new URL(withProtocol);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        if (!isWishbobHost(parsed.hostname)) {
            return null;
        }
        if (!parsed.pathname || parsed.pathname === "/") {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function unwrapProductUrl(rawUrl: string): string | null {
    const decoded = decodeHtmlEntities(rawUrl).trim();
    if (!decoded) {
        return null;
    }

    let current = decoded;
    for (let depth = 0; depth < 3; depth++) {
        let parsed: URL;
        try {
            parsed = new URL(current);
        } catch {
            return null;
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }

        const host = parsed.hostname.toLowerCase();
        let unwrapped: string | null = null;

        if (host === "go.skimresources.com" || host.endsWith(".skimresources.com")) {
            unwrapped = parsed.searchParams.get("url");
        } else if (host === "redirect.viglink.com" || host.endsWith(".viglink.com")) {
            unwrapped = parsed.searchParams.get("u");
        } else if (host === "click.linksynergy.com" || host.endsWith(".linksynergy.com")) {
            unwrapped = parsed.searchParams.get("murl") || parsed.searchParams.get("RD_PARM1");
        } else if (host === "www.awin1.com" || host === "awin1.com") {
            unwrapped = parsed.searchParams.get("ued");
        }

        if (unwrapped) {
            current = unwrapped.trim();
            continue;
        }

        if (/(^|\.)amazon\.[a-z.]+$/i.test(host)) {
            const tag = parsed.searchParams.get("tag");
            if (tag && /^(wunschliste|wishbob)/i.test(tag)) {
                parsed.searchParams.delete("tag");
                parsed.searchParams.delete("linkCode");
            }
            return parsed.toString();
        }

        return parsed.toString();
    }

    try {
        const finalUrl = new URL(current);
        if (finalUrl.protocol === "http:" || finalUrl.protocol === "https:") {
            return finalUrl.toString();
        }
    } catch {
        // ignore invalid URL
    }
    return null;
}

function getCurrencyFractionDigits(currency: string): number {
    try {
        const opts = new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions();
        return opts.maximumFractionDigits ?? 2;
    } catch {
        return 2;
    }
}

export function parseWishbobPrice(rawText: string): WishbobParsedPrice | null {
    const cleaned = normalizeWhitespace(decodeHtmlEntities(rawText));
    if (!cleaned) {
        return null;
    }

    let currency: string | null = null;
    const isoMatch = cleaned.match(/\b([A-Z]{3})\b/);
    if (isoMatch) {
        const candidate = isoMatch[1];
        try {
            new Intl.NumberFormat("en-US", { style: "currency", currency: candidate });
            currency = candidate;
        } catch {
            currency = null;
        }
    }

    if (!currency) {
        for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
            if (cleaned.includes(symbol)) {
                currency = code;
                break;
            }
        }
    }

    const numberMatch = cleaned.match(/(\d[\d.,\s]*\d|\d)/);
    if (!numberMatch || !currency) {
        return null;
    }

    const numStr = numberMatch[1].replace(/\s+/g, "");
    const lastComma = numStr.lastIndexOf(",");
    const lastDot = numStr.lastIndexOf(".");

    let normalizedNum: string;
    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            normalizedNum = numStr.replace(/\./g, "").replace(",", ".");
        } else {
            normalizedNum = numStr.replace(/,/g, "");
        }
    } else if (lastComma !== -1) {
        const fractionalDigits = numStr.length - lastComma - 1;
        if (fractionalDigits === 3 && numStr.indexOf(",") === lastComma) {
            normalizedNum = numStr.replace(/,/g, "");
        } else {
            normalizedNum = numStr.replace(",", ".");
        }
    } else {
        normalizedNum = numStr;
    }

    const amount = Number.parseFloat(normalizedNum);
    if (!Number.isFinite(amount) || amount < 0) {
        return null;
    }

    const fractionDigits = getCurrencyFractionDigits(currency);
    const value = Math.round(amount * Math.pow(10, fractionDigits));

    return {
        value,
        currency,
        raw: cleaned
    };
}

function extractAttribute(tagHtml: string, attrName: string): string | null {
    const regex = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
    const match = tagHtml.match(regex);
    if (!match) {
        return null;
    }
    return match[1] ?? match[2] ?? null;
}

function extractListTitle(html: string): string | null {
    const ogTitleMatch =
        html.match(/<meta[^>]+property\s*=\s*["']og:title["'][^>]+content\s*=\s*["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:title["']/i);
    if (ogTitleMatch?.[1]) {
        const title = normalizeWhitespace(decodeHtmlEntities(ogTitleMatch[1]));
        if (title) {
            return title;
        }
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch?.[1]) {
        const title = normalizeWhitespace(decodeHtmlEntities(titleMatch[1])).replace(/^Wishbob\s*-\s*/i, "");
        if (title) {
            return title;
        }
    }

    return null;
}

function resolveWishbobImageUrl(imgTag: string, baseUrl: string): string | null {
    const dataSrc = extractAttribute(imgTag, "data-src");
    const src = extractAttribute(imgTag, "src");
    const candidate = [dataSrc, src]
        .map((v) => (v ? decodeHtmlEntities(v).trim() : ""))
        .find((v) => v && !v.startsWith("data:"));

    if (!candidate) {
        return null;
    }

    try {
        const resolved = new URL(candidate, baseUrl);
        if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
            return null;
        }
        if (isWishbobHost(resolved.hostname) && resolved.pathname.startsWith("/assets/img/")) {
            return null;
        }
        return resolved.toString();
    } catch {
        return null;
    }
}

export function parseWishbobHtml(html: string, sourceUrl: string): WishbobParsedList {
    const listTitle = extractListTitle(html);

    let cardChunks = html.split(/(?=<div\b[^>]*\bid=["']wunsch_\d+["'])/i).slice(1);
    if (cardChunks.length === 0) {
        cardChunks = html.split(/(?=<div\b[^>]*\bclass=["'][^"']*\bwish-wrapper\b)/i).slice(1);
    }

    const items: WishbobItem[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < cardChunks.length; i++) {
        const chunk = cardChunks[i];

        const wishTagMatch = chunk.match(/<div\b[^>]*\bclass=["'](?:[^"']*\s)?wish(?:\s[^"']*)?["'][^>]*>/i);
        const wishTag = wishTagMatch?.[0] ?? "";
        const wishClasses = (extractAttribute(wishTag, "class") ?? "").toLowerCase();
        const wishIdAttr = extractAttribute(wishTag, "data-wish-id");
        const wrapperIdMatch = chunk.match(/\bid=["']wunsch_(\d+)["']/i);
        const externalId = wishIdAttr || wrapperIdMatch?.[1] || `wish-${i + 1}`;

        if (seenIds.has(externalId)) {
            continue;
        }

        const fulfilledAttr = extractAttribute(wishTag, "data-fulfilled");
        const fulfilled =
            fulfilledAttr === "1" ||
            fulfilledAttr === "true" ||
            /(?:^|\s)wish-fulfilled(?:\s|$)/.test(wishClasses) ||
            /(?:^|\s)fulfilled(?:\s|$)/.test(wishClasses);
        const inactive = /(?:^|\s)wish-inactive(?:\s|$)/.test(wishClasses);
        const mostWanted =
            /(?:^|\s)wish-(?:very-)?important(?:\s|$)/.test(wishClasses) ||
            extractAttribute(wishTag, "data-importance") === "2" ||
            extractAttribute(wishTag, "data-priority") === "2";

        const titleBlockMatch = chunk.match(
            /<div\b[^>]*\bclass=["'][^"']*\bwish-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        );
        const titleBlock = titleBlockMatch?.[1] ?? "";
        const titleAnchorMatch = titleBlock.match(/<a\b[^>]*>/i);
        const titleAnchorTag = titleAnchorMatch?.[0] ?? "";

        const imgTagMatch = chunk.match(/<img\b[^>]*\bclass=["'][^"']*\bwish-image\b[^"']*["'][^>]*>/i);
        const imgTag = imgTagMatch?.[0] ?? "";

        const rawTitle =
            extractAttribute(titleAnchorTag, "title") || stripTags(titleBlock) || extractAttribute(imgTag, "alt") || "";
        const name = normalizeWhitespace(decodeHtmlEntities(rawTitle));
        if (!name) {
            continue;
        }

        const productAnchorMatch =
            titleAnchorTag || chunk.match(/<a\b[^>]*\bclass=["'][^"']*\bjs-goto-product\b[^"']*["'][^>]*>/i)?.[0] || "";
        const rawHref = productAnchorMatch ? extractAttribute(productAnchorMatch, "href") : null;
        const url = rawHref ? unwrapProductUrl(rawHref) : null;

        const descMatch = chunk.match(
            /<p\b[^>]*\bclass=["'][^"']*\bwish-description\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i
        );
        const decodedDesc = descMatch?.[1] ? decodeHtmlEntities(stripTags(descMatch[1])) : "";
        const note = decodedDesc.length > 0 ? decodedDesc : null;

        const priceMatch = chunk.match(/<p\b[^>]*\bclass=["'][^"']*\bwish-price\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
        const price = priceMatch?.[1] ? parseWishbobPrice(stripTags(priceMatch[1])) : null;

        const imageUrl = imgTag ? resolveWishbobImageUrl(imgTag, sourceUrl) : null;

        seenIds.add(externalId);
        items.push({
            externalId,
            name,
            url,
            note,
            imageUrl,
            price,
            fulfilled,
            inactive,
            mostWanted
        });
    }

    return {
        sourceUrl,
        listTitle,
        items
    };
}
