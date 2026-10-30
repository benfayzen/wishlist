<script lang="ts">
    import { invalidateAll } from "$app/navigation";

    import { ItemAPI } from "$lib/api/items";
    import { ListItemAPI } from "$lib/api/lists";

    import type { ItemOnListDTO } from "$lib/dtos/item-dto";

    import { getFormatter } from "$lib/i18n";
    import { Dialog } from "@skeletonlabs/skeleton-svelte";
    import { toaster } from "../toaster";
    import BaseModal, { type BaseModalProps } from "./BaseModal.svelte";

    interface Props extends Omit<BaseModalProps, "title" | "description" | "children" | "element" | "actions"> {
        item: ItemOnListDTO;
        itemNameShort: string;
        isOnlyManager: boolean;
    }

    const { item, itemNameShort, isOnlyManager, ...props }: Props = $props();

    const t = getFormatter();
    const itemAPI = $derived(new ItemAPI(item.id));
    const listItemAPI = $derived(new ListItemAPI(item.list.id, item.id));

    let description = $derived(
        $t(
            item.listCount > 1
                ? "wishes.are-you-sure-you-wish-to-delete-item-multiple-lists"
                : "wishes.are-you-sure-you-wish-to-delete-item",
            { values: { name: itemNameShort } }
        )
    );

    async function onRemove() {
        const resp = await listItemAPI.delete();

        if (resp.ok) {
            invalidateAll();

            toaster.info({
                description: $t("wishes.item-was-removed-from-list", { values: { name: itemNameShort } })
            });
        } else {
            toaster.error({ description: $t("general.oops") });
        }
    }

    async function onDelete() {
        const resp = await itemAPI.delete();

        if (resp.ok) {
            invalidateAll();

            toaster.info({ description: $t("wishes.item-was-deleted", { values: { name: itemNameShort } }) });
        } else {
            toaster.error({ description: $t("general.oops") });
        }
    }
</script>

<BaseModal closeButtonLabel={$t("a11y.close")} {description} title={$t("general.please-confirm")} {...props}>
    {#snippet actions()}
        {#if item.listCount > 1}
            <div class="flex w-full flex-col gap-2">
                <div class="m3-claim-actions m3-claim-split m3-dialog-split-actions">
                    {#if !isOnlyManager}
                        <Dialog.CloseTrigger
                            class="m3-danger-tonal m3-button m3-claim-button m3-claim-split-left"
                            onclick={onDelete}
                        >
                            {$t("wishes.all-lists")}
                        </Dialog.CloseTrigger>
                    {/if}
                    <Dialog.CloseTrigger
                        class={[
                            "m3-primary m3-button m3-claim-button",
                            !isOnlyManager ? "m3-claim-split-right" : "w-full"
                        ]}
                        onclick={onRemove}
                    >
                        {$t("wishes.this-list")}
                    </Dialog.CloseTrigger>
                </div>
                <Dialog.CloseTrigger class="m3-secondary m3-button w-full">
                    {$t("general.cancel")}
                </Dialog.CloseTrigger>
            </div>
        {:else}
            <div class="m3-claim-actions m3-claim-split m3-dialog-split-actions">
                <Dialog.CloseTrigger class="m3-secondary m3-button m3-claim-button m3-claim-split-left">
                    {$t("general.cancel")}
                </Dialog.CloseTrigger>
                <Dialog.CloseTrigger
                    class="m3-danger m3-button m3-claim-button m3-claim-split-right"
                    onclick={onDelete}
                >
                    {$t("general.confirm")}
                </Dialog.CloseTrigger>
            </div>
        {/if}
    {/snippet}
</BaseModal>
