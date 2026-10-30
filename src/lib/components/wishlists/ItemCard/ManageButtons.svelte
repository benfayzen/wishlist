<script lang="ts">
    import type { InternalItemCardProps } from "./ItemCard.svelte";
    import { getFormatter } from "$lib/i18n";
    import ConfirmModal from "$lib/components/modals/ConfirmModal.svelte";
    import DeleteItemModal from "$lib/components/modals/DeleteItemModal.svelte";
    import { ListItemAPI } from "$lib/api/lists";
    import { toaster } from "$lib/components/toaster";
    import { resolve } from "$app/paths";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { userCanEdit } from "$lib/item-util";

    interface Props extends Pick<InternalItemCardProps, "item" | "user" | "userCanManage"> {
        onEdit?: VoidFunction;
    }

    const { item, user, userCanManage, onEdit }: Props = $props();
    const t = getFormatter();
    const listItemAPI = $derived(new ListItemAPI(item.list.id, item.id));

    let isOnlyManager = $derived(
        (user?.id !== item.user?.id && user?.id !== item.addedBy?.id && userCanManage) || false
    );
    let itemNameShort = $derived(item.name.length > 42 ? item.name.substring(0, 42) + "…" : item.name);

    const handleApproval = async (approve: boolean) => {
        const resp = await (approve ? listItemAPI.approve() : listItemAPI.deny());

        if (resp.ok) {
            toaster.info({
                description: $t("wishes.item-approved", { values: { name: itemNameShort, approved: approve } })
            });
        } else {
            toaster.error({ description: $t("general.oops") });
        }
    };

    const handleEdit = () => {
        onEdit?.();
        goto(resolve("/items/[itemId]/edit", { itemId: item.id.toString() }) + `?redirectTo=${page.url.pathname}`, {
            replaceState: true
        });
    };
</script>

{#snippet approvalButton(approve: boolean)}
    <ConfirmModal onConfirm={() => handleApproval(approve)}>
        {#snippet description()}
            {@html $t("wishes.approval-confirmation", { values: { name: item.addedBy?.name, approve } })}
        {/snippet}
        {#snippet trigger(props)}
            {#if approve}
                <button
                    {...props}
                    class="m3-secondary m3-button m3-button-small m3-claim-button"
                    aria-label={$t("wishes.approve")}
                    onclick={(e) => {
                        e.stopPropagation();
                        props.onclick?.(e);
                    }}
                    title={$t("wishes.approve")}
                    type="button"
                >
                    <iconify-icon aria-hidden="true" icon="ion:checkmark"></iconify-icon>
                    <span>{$t("wishes.approve")}</span>
                </button>
            {:else}
                <button
                    {...props}
                    class="m3-button m3-icon-button m3-claim-delete-button"
                    aria-label={$t("wishes.deny")}
                    onclick={(e) => {
                        e.stopPropagation();
                        props.onclick?.(e);
                    }}
                    title={$t("wishes.deny")}
                    type="button"
                >
                    <iconify-icon aria-hidden="true" icon="ion:close"></iconify-icon>
                </button>
            {/if}
        {/snippet}
    </ConfirmModal>
{/snippet}

{#snippet deleteButton(standalone = false)}
    <DeleteItemModal {isOnlyManager} {item} {itemNameShort}>
        {#snippet trigger(props)}
            {#if standalone}
                <button
                    {...props}
                    class="m3-button m3-button-small m3-claim-button m3-claim-delete-only-button"
                    aria-label={$t("wishes.delete")}
                    onclick={(e) => {
                        e.stopPropagation();
                        props.onclick?.(e);
                    }}
                    title={$t("wishes.delete")}
                    type="button"
                >
                    <iconify-icon aria-hidden="true" icon="ion:trash"></iconify-icon>
                    <span>{$t("wishes.delete")}</span>
                </button>
            {:else}
                <button
                    {...props}
                    class="m3-button m3-icon-button m3-claim-delete-button"
                    aria-label={$t("wishes.delete")}
                    onclick={(e) => {
                        e.stopPropagation();
                        props.onclick?.(e);
                    }}
                    title={$t("wishes.delete")}
                    type="button"
                >
                    <iconify-icon aria-hidden="true" icon="ion:trash"></iconify-icon>
                </button>
            {/if}
        {/snippet}
    </DeleteItemModal>
{/snippet}

{#if !item.approved || userCanEdit(item, user?.id) || userCanManage}
    {#if !item.approved}
        <div class="m3-claim-actions m3-claim-split">
            {@render approvalButton(true)}
            {@render approvalButton(false)}
        </div>
    {:else if userCanEdit(item, user?.id)}
        <div class="m3-claim-actions m3-claim-split">
            <button
                class="m3-secondary m3-button m3-button-small m3-claim-button"
                aria-label={$t("wishes.edit")}
                onclick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                }}
                title={$t("wishes.edit")}
                type="button"
            >
                <iconify-icon aria-hidden="true" icon="ion:edit"></iconify-icon>
                <span>{$t("wishes.edit")}</span>
            </button>
            {@render deleteButton(false)}
        </div>
    {:else if userCanManage}
        <div class="m3-claim-actions">
            {@render deleteButton(true)}
        </div>
    {/if}
{/if}
