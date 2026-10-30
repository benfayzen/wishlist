<script lang="ts">
    import { SystemUsersAPI } from "$lib/api/users";
    import type { ItemOnListDTO } from "$lib/dtos/item-dto";
    import { ListItemAPI } from "$lib/api/lists";
    import { ClaimAPI } from "$lib/api/claims";
    import { getFormatter } from "$lib/i18n";
    import { toaster } from "../toaster";
    import BaseModal, { type BaseModalProps } from "./BaseModal.svelte";
    import { Dialog } from "@skeletonlabs/skeleton-svelte";

    interface Props extends Omit<BaseModalProps, "title" | "description" | "actions" | "children" | "element"> {
        item: ItemOnListDTO;
        userId: string | undefined;
        groupId: string;
        requireClaimEmail: boolean;
        claimId?: string;
        onSuccess?: VoidFunction;
        onFailure?: VoidFunction;
        claimName?: string;
        alwaysShow?: boolean;
    }

    let {
        item,
        userId,
        groupId,
        claimId,
        requireClaimEmail,
        onSuccess,
        onFailure,
        trigger: inputTrigger,
        claimName,
        alwaysShow = false,
        ...rest
    }: Props = $props();

    const t = getFormatter();
    let open = $state(false);

    const claim = $derived(item.claims.find((claim) => claim.claimId === claimId));
    const isUnlimited = $derived(item.quantity === null || !Number.isFinite(item.remainingQuantity));
    const maxClaimable = $derived(isUnlimited ? undefined : item.remainingQuantity + (claim?.quantity || 0));
    const minClaimable = $derived(claim ? 0 : 1);
    const quantityInputId = $props.id();

    let title = $derived(
        claim
            ? claimName
                ? $t("wishes.update-claim-for-name", { values: { name: claimName } })
                : $t("wishes.update-claim")
            : $t("wishes.claim-item")
    );
    let username: string | undefined = $state();
    let name: string | undefined = $state();
    let quantity = $derived(claim?.quantity || 1);
    let error: string | undefined = $state();

    function stepQuantity(delta: number) {
        const current = Number(quantity) || minClaimable;
        const next = Math.max(minClaimable, current + delta);
        quantity = maxClaimable !== undefined ? Math.min(maxClaimable, next) : next;
        error = undefined;
    }

    async function handleTrigger(e: MouseEvent) {
        e.stopPropagation();
        error = undefined;
        if (!userId || alwaysShow) {
            open = true;
            return;
        }
        if (claim && item.quantity === 1 && claim.quantity === 1) {
            return onUnclaim();
        }
        if (!claim && !isUnlimited && item.remainingQuantity === 1) {
            quantity = 1;
            return onFormSubmit();
        }
        open = true;
    }

    async function onUnclaim() {
        quantity = 0;
        return onFormSubmit();
    }

    async function onFormSubmit() {
        if (maxClaimable !== undefined && quantity > maxClaimable) {
            error = $t("errors.could-not-claim-quantity-items", {
                values: { quantity, availableQuantity: item.remainingQuantity }
            });
            return;
        }

        if (userId) {
            if (claim) {
                handleUpdateClaim(claim.claimId);
            } else {
                handleUserClaim(userId);
            }
        } else {
            handlePublicClaim();
        }
    }

    async function handleUpdateClaim(claimId: string) {
        const claimAPI = new ClaimAPI(claimId);
        const resp = await claimAPI.updateQuantity(quantity);
        if (resp.ok) {
            let description;
            if (quantity === 0) {
                description = $t("wishes.claimed-item", { values: { claimed: false } });
            } else {
                description = $t("wishes.updated-claim");
            }
            closeAndToast(description);
        } else {
            const respData = await resp.json();
            errorAndToast(respData?.message);
        }
    }

    async function handleUserClaim(userId: string) {
        const listItemAPI = new ListItemAPI(item.list.id, item.id);
        const resp = await listItemAPI.claim(userId, quantity);

        if (resp.ok) {
            closeAndToast($t("wishes.claimed-item", { values: { claimed: true } }));
        } else {
            const respData = await resp.json();
            errorAndToast(respData?.message);
        }
    }

    async function handlePublicClaim() {
        const systemUsersAPI = new SystemUsersAPI(groupId);
        const userResp = await systemUsersAPI.create(username, name);
        if (!userResp.ok) {
            const responseData = await userResp.json();
            errorAndToast(responseData?.message);
            return;
        }
        const { id: publicUserId } = await userResp.json();

        const listItemAPI = new ListItemAPI(item.list.id, item.id);
        const resp = await listItemAPI.claimPublic(publicUserId, quantity);

        if (resp.ok) {
            closeAndToast($t("wishes.claimed-item", { values: { claimed: true } }));
        } else {
            const respData = await resp.json();
            errorAndToast(respData?.message);
        }
    }

    function errorAndToast(message?: string) {
        onFailure?.();
        toaster.error({ description: message || $t("general.oops") });
    }

    function closeAndToast(description: string) {
        // wait for transition to finish before triggering toast
        setTimeout(() => toaster.info({ description }), open ? 275 : 0);
        open = false;

        onSuccess?.();
    }
</script>

{#snippet description()}
    {#if !userId}
        <span>{$t("wishes.before-you-can-claim-the-item-we-just-need-one-thing-from-you")}</span>
    {/if}
{/snippet}

<BaseModal {description} onOpenChange={(e) => (open = e.open)} {open} {title} {...rest}>
    {#snippet trigger(props)}
        {@render inputTrigger({ ...props, onclick: handleTrigger })}
    {/snippet}

    {#if !userId}
        <div class="flex flex-col gap-3">
            <label class="m3-label w-full">
                <span>{$t("general.name-optional")}</span>
                <div class="m3-field grid-cols-[auto_1fr_auto]">
                    <div class="m3-field-slot">
                        <iconify-icon class="text-lg" icon="ion:person"></iconify-icon>
                    </div>
                    <input class="m3-field-input" type="text" bind:value={name} />
                </div>
            </label>

            {#if requireClaimEmail}
                <label class="m3-label w-full">
                    <span>{$t("auth.email")}</span>
                    <div class="m3-field grid-cols-[auto_1fr_auto]">
                        <div class="m3-field-slot">
                            <iconify-icon class="text-lg" icon="ion:mail"></iconify-icon>
                        </div>
                        <input class="m3-field-input" required type="email" bind:value={username} />
                    </div>
                </label>
            {/if}
        </div>
    {/if}

    <div class="m3-claim-modal-body">
        <div class="m3-claim-modal-item">
            <iconify-icon aria-hidden="true" icon="ion:gift-outline"></iconify-icon>
            <span>{item.name}</span>
        </div>

        {#if isUnlimited || item.remainingQuantity > 1 || claim}
            <div class="flex flex-col gap-2">
                <label class="m3-label w-full" for={quantityInputId}>
                    <span>{$t("wishes.enter-the-quantity-to-claim")}</span>
                </label>
                <div class={["m3-field m3-quantity-stepper", error && "m3-invalid"]}>
                    <div class="m3-field-slot">
                        <iconify-icon aria-hidden="true" class="text-lg" icon="ion:layers-outline"></iconify-icon>
                    </div>
                    <input
                        id={quantityInputId}
                        class={["m3-field-input", error && "m3-invalid"]}
                        inputmode="numeric"
                        max={maxClaimable}
                        min={minClaimable}
                        oninput={() => (error = undefined)}
                        required
                        step="1"
                        type="number"
                        bind:value={quantity}
                    />
                    <div class="m3-quantity-stepper-controls">
                        <button
                            class="m3-quantity-step-btn"
                            aria-label="-"
                            disabled={quantity <= minClaimable}
                            onclick={() => stepQuantity(-1)}
                            tabindex="-1"
                            type="button"
                        >
                            <iconify-icon aria-hidden="true" icon="ion:remove"></iconify-icon>
                        </button>
                        <button
                            class="m3-quantity-step-btn"
                            aria-label="+"
                            disabled={maxClaimable !== undefined && quantity >= maxClaimable}
                            onclick={() => stepQuantity(1)}
                            tabindex="-1"
                            type="button"
                        >
                            <iconify-icon aria-hidden="true" icon="ion:add"></iconify-icon>
                        </button>
                    </div>
                </div>
                {#if claim}
                    <div class="m3-claim-modal-info">
                        <iconify-icon aria-hidden="true" icon="ion:information-circle-outline"></iconify-icon>
                        <span>
                            {#if claimName}
                                {$t("wishes.claimed-info-text-for-name", {
                                    values: { claimedQuantity: claim.quantity, name: claimName }
                                })}
                            {:else}
                                {$t("wishes.claimed-info-text", {
                                    values: { claimedQuantity: claim.quantity }
                                })}
                            {/if}
                            {#if !isUnlimited && item.quantity}
                                {$t("wishes.additional-items-requested", {
                                    values: { remainingQuantity: item.remainingQuantity }
                                })}
                            {/if}
                        </span>
                    </div>
                {:else if !isUnlimited && item.quantity}
                    <div class="m3-claim-modal-info">
                        <iconify-icon aria-hidden="true" icon="ion:information-circle-outline"></iconify-icon>
                        <span>
                            {$t("wishes.additional-items-requested", {
                                values: { remainingQuantity: item.remainingQuantity }
                            })}
                        </span>
                    </div>
                {:else if isUnlimited}
                    <div class="m3-claim-modal-info">
                        <iconify-icon aria-hidden="true" icon="ion:infinite-outline"></iconify-icon>
                        <span>{$t("wishes.no-limit")}</span>
                    </div>
                {/if}
            </div>
        {/if}

        {#if error}
            <span class="text-invalid">{error}</span>
        {/if}
    </div>

    {#snippet actions({ neutralStyle, negativeStyle, positiveStyle })}
        <Dialog.CloseTrigger class={[neutralStyle, claim && "mr-auto"]} type="button">
            <span>{$t("general.cancel")}</span>
        </Dialog.CloseTrigger>

        {#if claim}
            <div class="m3-claim-actions m3-claim-split">
                <button class={[negativeStyle, "m3-claim-split-left"]} onclick={onUnclaim} type="button">
                    <iconify-icon aria-hidden="true" icon="ion:bookmark-outline"></iconify-icon>
                    <span>{$t("wishes.unclaim")}</span>
                </button>
                <button class={[positiveStyle, "m3-claim-split-right"]} onclick={onFormSubmit} type="button">
                    <iconify-icon aria-hidden="true" icon="ion:checkmark"></iconify-icon>
                    <span>{$t("wishes.claim")}</span>
                </button>
            </div>
        {:else}
            <button class={positiveStyle} onclick={onFormSubmit} type="button">
                <iconify-icon aria-hidden="true" icon="ion:bookmark-outline"></iconify-icon>
                <span>{$t("wishes.claim")}</span>
            </button>
        {/if}
    {/snippet}
</BaseModal>
