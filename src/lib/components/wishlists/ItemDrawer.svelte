<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { getFormatter } from "$lib/i18n";
    import ItemImage from "./ItemCard/components/ItemImage.svelte";
    import ItemAttributes from "./ItemCard/components/ItemAttributes.svelte";
    import { Dialog, Portal, type DialogRootProps } from "@skeletonlabs/skeleton-svelte";
    import ModalContent from "../modals/parts/ModalContent.svelte";
    import ModalBackdrop from "../modals/parts/ModalBackdrop.svelte";
    import type { InternalItemCardProps } from "./ItemCard/ItemCard.svelte";
    import ItemFooter from "./ItemCard/components/ItemFooter.svelte";

    let { defaultImage: _defaultImage, item, ...props }: InternalItemCardProps = $props();
    const t = getFormatter();

    let open = $state(false);

    $effect(() => {
        if (page.url.searchParams.get("item-id") === item.id.toString()) {
            open = true;
        }
    });

    async function closeDialog() {
        await goto(page.url.pathname, { replaceState: true, noScroll: true });
        open = false;
    }

    const onOpenChange: DialogRootProps["onOpenChange"] = async (details) => {
        if (details.open) {
            open = true;
        } else {
            open = false;
            await goto(page.url.pathname, { replaceState: true, noScroll: true });
        }
    };
</script>

<Dialog {onOpenChange} {open}>
    <Portal>
        <ModalBackdrop class="m3-item-dialog-scrim" />
        <Dialog.Positioner class="m3-item-dialog-positioner">
            <ModalContent class="m3-item-dialog">
                <div class="m3-item-dialog-layout">
                    <header class="m3-item-dialog-header">
                        <Dialog.Title class="m3-item-dialog-title">
                            {item.name}
                        </Dialog.Title>
                        <Dialog.CloseTrigger
                            class="m3-icon-button m3-item-dialog-close"
                            aria-label={$t("a11y.close")}
                            onclick={closeDialog}
                        >
                            <iconify-icon aria-hidden="true" icon="ion:close"></iconify-icon>
                        </Dialog.CloseTrigger>
                    </header>

                    <div class="m3-item-dialog-body">
                        <div class="m3-item-dialog-media">
                            <ItemImage class="m3-item-dialog-image" {item}>
                                {#snippet defaultImage(t)}
                                    {@render _defaultImage(t, "m3-item-dialog-placeholder")}
                                {/snippet}
                            </ItemImage>
                        </div>

                        <div class="m3-item-dialog-details">
                            <ItemAttributes {...props} fullNotes {item} showDetail />
                        </div>

                        {#if item.url}
                            <a
                                class="m3-button m3-outlined m3-item-dialog-link"
                                href={item.url}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <span>{$t("wishes.view-item")}</span>
                                <iconify-icon aria-hidden="true" icon="ion:open-outline"></iconify-icon>
                            </a>
                        {/if}
                    </div>

                    <div class="m3-item-dialog-actions [&>footer]:flex-wrap [&>footer]:p-0">
                        <ItemFooter {...props} {item} noPadding onEdit={() => (open = false)} />
                    </div>
                </div>
            </ModalContent>
        </Dialog.Positioner>
    </Portal>
</Dialog>
