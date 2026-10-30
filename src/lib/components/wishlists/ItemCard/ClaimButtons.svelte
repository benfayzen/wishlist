<script lang="ts">
    import type { InternalItemCardProps } from "./ItemCard.svelte";
    import { getFormatter } from "$lib/i18n";
    import { getClaimedName, shouldShowName } from "../util";
    import ClaimItemModal from "$lib/components/modals/ClaimItemModal.svelte";
    import { ClaimAPI } from "$lib/api/claims";
    import { toaster } from "$lib/components/toaster";

    interface Props extends Pick<
        InternalItemCardProps,
        | "item"
        | "user"
        | "showClaimedName"
        | "showNameAcrossGroups"
        | "showClaimForOwner"
        | "showPublicClaimName"
        | "onPublicList"
        | "groupId"
        | "requireClaimEmail"
        | "isSelfClaimable"
    > {
        isClaimableOrClaimed?: (ans: boolean) => void;
    }

    let {
        item,
        user,
        showClaimedName = false,
        showNameAcrossGroups = false,
        showClaimForOwner = false,
        showPublicClaimName = false,
        onPublicList = false,
        groupId,
        requireClaimEmail,
        isClaimableOrClaimed,
        isSelfClaimable
    }: Props = $props();

    const t = getFormatter();

    let userClaim = $derived(item.claims.find((claim) => claim.claimedBy && claim.claimedBy.id === user?.id));
    let isClaimOnList = $derived(userClaim?.listId === item.list.id);

    $effect(() => isClaimableOrClaimed?.(item.isClaimable || (userClaim && isClaimOnList) || false));

    const handlePurchased = async (purchased: boolean) => {
        if (userClaim && isClaimOnList) {
            const claimAPI = new ClaimAPI(userClaim?.claimId);
            const resp = await (purchased ? claimAPI.purchase() : claimAPI.unpurchase());
            if (resp.ok) {
                toaster.info({ description: $t("wishes.purchased-toast", { values: { purchased } }) });
                userClaim.purchased = purchased;
            }
        }
    };
</script>

{#if !onPublicList && item.userId === user?.id && !showClaimForOwner}{:else if userClaim}
    {#if isClaimOnList}
        {#if userClaim.purchased}
            <div class="m3-claim-actions">
                <button
                    class="m3-button m3-button-small m3-claim-button m3-claim-purchased-button"
                    aria-label={$t("a11y.unpurchase")}
                    aria-pressed={userClaim.purchased}
                    onclick={(e) => {
                        e.stopPropagation();
                        handlePurchased?.(false);
                    }}
                    title={$t("a11y.unpurchase")}
                >
                    <iconify-icon aria-hidden="true" icon="ion:bag-check"></iconify-icon>
                    <span>{$t("a11y.unpurchase")}</span>
                </button>
            </div>
        {:else}
            {@const isSingleUnclaim = item.quantity === 1 && userClaim.quantity === 1}
            <div class="m3-claim-actions m3-claim-split">
                <ClaimItemModal claimId={userClaim?.claimId} {groupId} {item} {requireClaimEmail} userId={user?.id}>
                    {#snippet trigger(props)}
                        <button {...props} class="m3-secondary m3-button m3-button-small m3-claim-button">
                            <iconify-icon
                                aria-hidden="true"
                                icon={isSingleUnclaim ? "ion:bookmark-outline" : "ion:options-outline"}
                            ></iconify-icon>
                            <span>
                                {isSingleUnclaim ? $t("wishes.unclaim") : $t("wishes.update-claim")}
                            </span>
                        </button>
                    {/snippet}
                </ClaimItemModal>
                <button
                    class="m3-button m3-icon-button m3-toggle-icon-button m3-claim-purchase-button"
                    aria-label={$t("wishes.purchase")}
                    aria-pressed={userClaim.purchased}
                    onclick={(e) => {
                        e.stopPropagation();
                        handlePurchased?.(true);
                    }}
                    title={$t("wishes.purchase")}
                >
                    <iconify-icon icon="ion:bag"></iconify-icon>
                </button>
            </div>
        {/if}
    {:else}
        <span class="text-subtle line-clamp-2 truncate text-wrap">{$t("wishes.claimed-by-you-on-another-list")}</span>
    {/if}
{:else if item.isClaimable && (item.userId !== user?.id || isSelfClaimable)}
    <div class="m3-claim-actions">
        <ClaimItemModal {groupId} {item} {requireClaimEmail} userId={user?.id}>
            {#snippet trigger(props)}
                <button {...props} class="m3-button m3-button-small m3-primary m3-claim-button">
                    <iconify-icon aria-hidden="true" icon="ion:bookmark-outline"></iconify-icon>
                    <span>{$t("wishes.claim")}</span>
                </button>
            {/snippet}
        </ClaimItemModal>
    </div>
{:else if item.claims.length === 0 || (item.userId === user?.id && item.isClaimable)}{:else if item.claims.length === 1 && shouldShowName(item, showClaimedName, showNameAcrossGroups, showClaimForOwner, showPublicClaimName, user, item.claims[0])}
    <span class="text-subtle line-clamp-2 truncate text-wrap">
        {$t("wishes.claimed-by", {
            values: {
                name: getClaimedName(item.claims[0])
            }
        })}
    </span>
{:else if item.claims.length > 1 && shouldShowName(item, showClaimedName, showNameAcrossGroups, showClaimForOwner, showPublicClaimName, user)}
    <span class="text-subtle line-clamp-2 truncate text-wrap">{$t("wishes.claimed-by-multiple-users")}</span>
{:else}
    <span class="text-subtle line-clamp-2 truncate text-wrap">{$t("wishes.claimed")}</span>
{/if}
