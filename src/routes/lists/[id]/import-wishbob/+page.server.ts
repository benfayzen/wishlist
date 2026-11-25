import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireLogin } from "$lib/server/auth";
import { getFormatter } from "$lib/server/i18n";
import { getById, getNextDisplayOrderForLists } from "$lib/server/list";
import { client } from "$lib/server/prisma";
import { fetchWishbobList, WishbobImportError, type WishbobItem } from "$lib/server/wishbob";
import { parseAcceptLanguageHeader } from "$lib/i18n";
import { createImage } from "$lib/server/image-util";
import { getItemInclusions } from "$lib/server/items";
import { itemEmitter } from "$lib/server/events/emitters";
import { ItemEvent } from "$lib/events";
import { logger } from "$lib/server/logger";
import z from "zod";

export interface WishbobPreviewItem extends WishbobItem {
    alreadyInList: boolean;
}

const httpUrlSchema = z
    .string()
    .trim()
    .url()
    .refine((value) => {
        try {
            const parsed = new URL(value);
            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
            return false;
        }
    });

const importItemSchema = z.object({
    name: z.string().trim().min(1).max(500),
    url: httpUrlSchema.nullable().optional(),
    note: z.string().trim().max(4000).nullable().optional(),
    imageUrl: httpUrlSchema.nullable().optional(),
    price: z
        .object({
            value: z.number().int().min(0),
            currency: z.string().trim().length(3)
        })
        .nullable()
        .optional(),
    mostWanted: z.boolean().optional().default(false)
});

const importPayloadSchema = z.array(importItemSchema).min(1).max(200);

function normalizeForDuplicateCheck(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }
    const normalized = value.trim().toLowerCase().replace(/\/+$/, "");
    return normalized.length > 0 ? normalized : null;
}

async function authorizeListForImport(listId: string, userId: string) {
    const $t = await getFormatter();
    const list = await getById(listId);
    if (!list) {
        error(404, $t("errors.list-not-found"));
    }

    const isOwner = list.owner.id === userId;
    const isManager = list.managers.some(({ userId: managerId }) => managerId === userId);
    if (!isOwner && !isManager) {
        error(403, $t("errors.not-authorized"));
    }

    return { list, isOwner, isManager };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const runWorker = async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            results[currentIndex] = await worker(items[currentIndex]);
        }
    };

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
    await Promise.all(workers);
    return results;
}

export const load: PageServerLoad = async ({ params }) => {
    const user = requireLogin();
    const { list, isOwner } = await authorizeListForImport(params.id, user.id);

    return {
        themeSeed: list.iconColor,
        list: {
            id: list.id,
            name: list.name,
            owner: {
                name: list.owner.name,
                isMe: isOwner
            }
        }
    };
};

export const actions: Actions = {
    preview: async ({ request, params }) => {
        const user = requireLogin();
        const $t = await getFormatter();
        const { list } = await authorizeListForImport(params.id, user.id);

        const formData = await request.formData();
        const rawUrl = String(formData.get("url") ?? "").trim();
        if (!rawUrl) {
            return fail(400, {
                url: rawUrl,
                error: $t("errors.wishbob-invalid-url")
            });
        }

        const locales = parseAcceptLanguageHeader(request.headers.get("accept-language"));

        try {
            const parsed = await fetchWishbobList(rawUrl, locales);

            const existingListItems = await client.listItem.findMany({
                where: { listId: list.id },
                select: {
                    item: {
                        select: {
                            name: true,
                            url: true
                        }
                    }
                }
            });

            const existingNames = new Set(
                existingListItems
                    .map(({ item }) => normalizeForDuplicateCheck(item.name))
                    .filter((v): v is string => v !== null)
            );
            const existingUrls = new Set(
                existingListItems
                    .map(({ item }) => normalizeForDuplicateCheck(item.url))
                    .filter((v): v is string => v !== null)
            );

            const previewItems: WishbobPreviewItem[] = parsed.items.map((item) => {
                const normalizedName = normalizeForDuplicateCheck(item.name);
                const normalizedUrl = normalizeForDuplicateCheck(item.url);
                const alreadyInList = Boolean(
                    (normalizedUrl && existingUrls.has(normalizedUrl)) ||
                    (normalizedName && existingNames.has(normalizedName))
                );
                return {
                    ...item,
                    alreadyInList
                };
            });

            return {
                url: rawUrl,
                preview: {
                    sourceUrl: parsed.sourceUrl,
                    listTitle: parsed.listTitle,
                    items: previewItems
                }
            };
        } catch (err) {
            if (err instanceof WishbobImportError) {
                if (err.code === "invalid-url") {
                    return fail(400, { url: rawUrl, error: $t("errors.wishbob-invalid-url") });
                }
                if (err.code === "empty-list") {
                    return fail(422, { url: rawUrl, error: $t("errors.wishbob-empty-list") });
                }
                return fail(424, { url: rawUrl, error: $t("errors.wishbob-fetch-failed") });
            }
            logger.error({ err }, "Unexpected error previewing Wishbob list");
            return fail(500, { url: rawUrl, error: $t("errors.wishbob-fetch-failed") });
        }
    },

    import: async ({ request, params }) => {
        const user = requireLogin();
        const $t = await getFormatter();
        const { list } = await authorizeListForImport(params.id, user.id);

        const formData = await request.formData();
        const rawItems = formData.get("items");
        if (typeof rawItems !== "string") {
            return fail(400, { importError: $t("errors.wishbob-no-items-selected") });
        }

        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(rawItems);
        } catch {
            return fail(400, { importError: $t("errors.wishbob-no-items-selected") });
        }

        const validated = importPayloadSchema.safeParse(parsedJson);
        if (!validated.success) {
            return fail(400, { importError: $t("errors.wishbob-no-items-selected") });
        }

        const itemsToImport = validated.data;

        const savedImages = await mapWithConcurrency(itemsToImport, 4, async (item) => {
            if (!item.imageUrl) {
                return null;
            }
            try {
                return await createImage(item.name, item.imageUrl);
            } catch (err) {
                logger.warn({ err, imageUrl: item.imageUrl }, "Skipping Wishbob item image that failed to process");
                return null;
            }
        });

        const nextDisplayOrderByList = await getNextDisplayOrderForLists([list.id], false);
        let nextDisplayOrder = nextDisplayOrderByList[list.id] || 0;

        let importedCount = 0;
        for (let i = 0; i < itemsToImport.length; i++) {
            const itemData = itemsToImport[i];
            const savedImage = savedImages[i];

            let itemPriceId: string | null = null;
            if (itemData.price) {
                const createdPrice = await client.itemPrice.create({
                    data: {
                        value: itemData.price.value,
                        currency: itemData.price.currency
                    }
                });
                itemPriceId = createdPrice.id;
            }

            const createdItem = await client.item.create({
                data: {
                    userId: list.listMode === "registry" ? user.id : list.owner.id,
                    name: itemData.name,
                    url: itemData.url || null,
                    note: itemData.note || null,
                    imageUrl: savedImage,
                    createdById: user.id,
                    itemPriceId,
                    mostWanted: itemData.mostWanted ?? false,
                    lists: {
                        create: [
                            {
                                listId: list.id,
                                addedById: user.id,
                                approved: true,
                                displayOrder: nextDisplayOrder++
                            }
                        ]
                    }
                },
                include: getItemInclusions()
            });

            itemEmitter.emit(ItemEvent.ITEM_CREATE, createdItem);
            importedCount++;
        }

        redirect(303, `/lists/${list.id}?imported=${importedCount}`);
    }
};
