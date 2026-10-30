import { getFormatter } from "$lib/server/i18n";
import { itemEmitter } from "$lib/server/events/emitters";
import { client } from "$lib/server/prisma";
import type { RequestHandler } from "./$types";
import { error, isHttpError } from "@sveltejs/kit";
import { listItemClaimSchema } from "$lib/server/validations";
import type { Prisma } from "$lib/generated/prisma/client";
import { getItemInclusions } from "$lib/server/items";
import { ItemEvent } from "$lib/events";
import { logger } from "$lib/server/logger";
import z from "zod";
import { getListMembership } from "$lib/server/list-sharing";

// Claim an item on a list
export const PUT: RequestHandler = async ({ locals, request, params }) => {
    const $t = await getFormatter();

    const itemId = parseInt(params.itemId);
    if (isNaN(itemId)) {
        error(400, $t("errors.item-id-must-be-a-number"));
    }

    const body = (await request.json()) as Record<string, unknown>[];
    const updateData = listItemClaimSchema.safeParse(body);

    if (updateData.error) {
        error(422, JSON.stringify(z.flattenError(updateData.error).fieldErrors));
    }
    if (!updateData.data.claimedById && !updateData.data.publicClaimedById) {
        error(400, $t("errors.claimed-by-user-must-be-specified"));
    }

    const list = await client.list.findUnique({
        select: {
            id: true,
            public: true,
            groupId: true,
            groupShares: { select: { groupId: true } },
            allowSelfClaims: true,
            notForMe: true,
            ownerId: true
        },
        where: {
            id: params.listId
        }
    });

    if (!list) {
        error(404, $t("errors.list-not-found"));
    }

    if (updateData.data.claimedById !== undefined && updateData.data.claimedById !== null) {
        if (!locals.user) {
            error(401, $t("errors.unauthenticated"));
        } else if (locals.user.id !== updateData.data.claimedById) {
            error(403, $t("errors.no-claim-on-behalf-of"));
        }
    }
    if (updateData.data.publicClaimedById && !list.public) {
        error(404, $t("errors.list-not-found"));
    }

    const isSelfClaimable = list.allowSelfClaims || list.notForMe;
    if (updateData.data.claimedById === list.ownerId && !isSelfClaimable) {
        error(400, $t("errors.this-list-does-not-allow-self-claimed-items"));
    }

    const item = await client.item.findUnique({
        select: {
            id: true,
            quantity: true,
            claims: {
                select: {
                    quantity: true
                }
            }
        },
        where: {
            id: itemId,
            lists: {
                some: {
                    listId: list.id
                }
            }
        }
    });

    if (!item) {
        error(404, $t("errors.item-not-found-on-list"));
    }

    if (locals.user) {
        if (locals.user.id !== list.ownerId && !(await getListMembership(list, locals.user.id))) {
            error(403, $t("errors.this-list-is-not-part-of-your-active-group"));
        }
    }

    const claimedQuantity = item.claims.reduce((a, { quantity }) => a + quantity, 0);
    if (item.quantity !== null && claimedQuantity + updateData.data.quantity > item.quantity) {
        error(
            422,
            $t("errors.could-not-claim-quantity-items", {
                values: { quantity: updateData.data.quantity, availableQuantity: item.quantity - claimedQuantity }
            })
        );
    }

    try {
        const data: Prisma.ItemClaimCreateInput = {
            item: {
                connect: {
                    id: item.id
                }
            },
            list: {
                connect: {
                    id: list.id
                }
            },
            quantity: updateData.data.quantity
        };
        if (updateData.data.claimedById) {
            data.claimedBy = {
                connect: {
                    id: updateData.data.claimedById
                }
            };
        } else if (updateData.data.publicClaimedById) {
            data.publicClaimedBy = {
                connect: {
                    id: updateData.data.publicClaimedById
                }
            };
        }

        await client.$transaction(async (tx) => {
            const permitted = await tx.list.count({
                where: {
                    id: list.id,
                    ...(locals.user
                        ? {
                              OR: [
                                  { ownerId: locals.user.id },
                                  {
                                      groupShares: {
                                          some: { group: { UserGroupMembership: { some: { userId: locals.user.id } } } }
                                      }
                                  }
                              ]
                          }
                        : { public: true })
                }
            });
            if (!permitted) error(403, $t("errors.not-authorized"));
            const current = await tx.item.findUnique({
                where: { id: item.id, lists: { some: { listId: list.id } } },
                select: { quantity: true, claims: { select: { quantity: true } } }
            });
            if (!current) error(404, $t("errors.item-not-found-on-list"));
            const reserved = current.claims.reduce((sum, claim) => sum + claim.quantity, 0);
            if (current.quantity !== null && reserved + updateData.data.quantity > current.quantity) {
                error(
                    422,
                    $t("errors.could-not-claim-quantity-items", {
                        values: { quantity: updateData.data.quantity, availableQuantity: current.quantity - reserved }
                    })
                );
            }
            await tx.itemClaim.create({ data });
        });
        const updatedItem = await client.item.findUnique({
            where: {
                id: item.id
            },
            include: getItemInclusions()
        });
        if (updatedItem) itemEmitter.emit(ItemEvent.ITEM_UPDATE, updatedItem);

        return new Response(null, { status: 200 });
    } catch (err) {
        if (isHttpError(err)) throw err;
        logger.error({ err }, "Error claiming item");
        error(422, $t("general.oops"));
    }
};
