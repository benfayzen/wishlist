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
            <button
                {...props}
                class="m3-action-pill"
                aria-label={approve ? $t("wishes.approve") : $t("wishes.deny")}
                data-tone={approve ? undefined : "danger"}
                onclick={(e) => {
                    e.stopPropagation();
                    props.onclick?.(e);
                }}
                title={approve ? $t("wishes.approve") : $t("wishes.deny")}
                type="button"
            >
                <span class="m3-action-pill-surface">
                    <iconify-icon aria-hidden="true" icon={approve ? "ion:checkmark" : "ion:close"}></iconify-icon>
                    <span>{approve ? $t("wishes.approve") : $t("wishes.deny")}</span>
                </span>
            </button>
        {/snippet}
    </ConfirmModal>
{/snippet}

{#snippet deleteButton()}
    <DeleteItemModal {isOnlyManager} {item} {itemNameShort}>
        {#snippet trigger(props)}
            <button
                {...props}
                class="m3-action-pill"
                aria-label={$t("wishes.delete")}
                data-tone="danger"
                onclick={(e) => {
                    e.stopPropagation();
                    props.onclick?.(e);
                }}
                title={$t("wishes.delete")}
                type="button"
            >
                <span class="m3-action-pill-surface">
                    <iconify-icon aria-hidden="true" icon="ion:trash"></iconify-icon>
                    <span>{$t("wishes.delete")}</span>
                </span>
            </button>
        {/snippet}
    </DeleteItemModal>
{/snippet}

{#if !item.approved || userCanEdit(item, user?.id) || userCanManage}
    <div class="flex min-w-0 flex-wrap justify-end gap-x-2">
        {#if !item.approved}
            {@render approvalButton(true)}
            {@render approvalButton(false)}
        {:else if userCanEdit(item, user?.id)}
            <button
                class="m3-action-pill"
                aria-label={$t("wishes.edit")}
                onclick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                }}
                title={$t("wishes.edit")}
                type="button"
            >
                <span class="m3-action-pill-surface">
                    <iconify-icon aria-hidden="true" icon="ion:edit"></iconify-icon>
                    <span>{$t("wishes.edit")}</span>
                </span>
            </button>
            {@render deleteButton()}
        {:else if userCanManage}
            {@render deleteButton()}
        {/if}
    </div>
{/if}
