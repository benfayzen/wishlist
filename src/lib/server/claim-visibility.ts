import type { ItemOnListDTO } from "$lib/dtos/item-dto";

/** Apply the same privacy rules to HTML data and live updates. */
export function visibleClaims(
    item: ItemOnListDTO,
    config: Config,
    viewerId?: string,
    groupId?: string,
    notForMe = false
) {
    if (item.userId === viewerId && !config.claims.showForOwner && !notForMe) {
        return {
            ...item,
            claims: [],
            claimedQuantity: 0,
            remainingQuantity: item.quantity ?? Infinity,
            isClaimable: item.approved && (item.quantity === null || item.quantity > 0)
        };
    }
    return {
        ...item,
        claims: item.claims.map((claim) => {
            if (claim.claimedBy) {
                const own = claim.claimedBy.id === viewerId;
                const nameVisible =
                    own ||
                    (viewerId &&
                        config.claims.showName &&
                        (config.claims.showNameAcrossGroups || claim.claimedBy.groups.includes(groupId ?? "")));
                return {
                    ...claim,
                    claimedBy: {
                        ...claim.claimedBy,
                        name: nameVisible ? claim.claimedBy.name : "",
                        groups: nameVisible && groupId ? [groupId] : []
                    }
                };
            }
            return {
                ...claim,
                publicClaimedBy: {
                    ...claim.publicClaimedBy,
                    name: config.claims.showName && config.claims.showNamePublic ? claim.publicClaimedBy.name : null
                }
            };
        })
    };
}
