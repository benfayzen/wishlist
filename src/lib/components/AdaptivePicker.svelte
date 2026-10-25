<script lang="ts">
    import { Dialog, Portal, type PopoverTriggerProps } from "@skeletonlabs/skeleton-svelte";
    import { MediaQuery } from "svelte/reactivity";
    import type { Snippet } from "svelte";
    import Popup from "./Popup.svelte";
    import { getFormatter } from "$lib/i18n";

    let {
        open = $bindable(false),
        label,
        trigger,
        children
    }: {
        open?: boolean;
        label: string;
        trigger: NonNullable<PopoverTriggerProps["element"]>;
        children: Snippet;
    } = $props();
    const compact = new MediaQuery("(max-width: 599px)", false);
    const t = getFormatter();
</script>

{#if compact.current}
    <Dialog onOpenChange={(event) => (open = event.open)} {open}>
        <Dialog.Trigger element={trigger} />
        <Portal>
            <Dialog.Backdrop class="m3-sheet-backdrop" />
            <Dialog.Positioner class="m3-sheet-positioner">
                <Dialog.Content class="m3-picker-sheet">
                    <div class="m3-picker-heading">
                        <Dialog.Title>{label}</Dialog.Title>
                        <Dialog.CloseTrigger class="m3-icon-button m3-text-button" aria-label={$t("a11y.close")}>
                            <iconify-icon aria-hidden="true" icon="material-symbols:close-rounded"></iconify-icon>
                        </Dialog.CloseTrigger>
                    </div>
                    {@render children()}
                </Dialog.Content>
            </Dialog.Positioner>
        </Portal>
    </Dialog>
{:else}
    <Popup placement="bottom-start" {trigger} bind:open>
        {#snippet content(props)}
            <div {...props} class="m3-picker-panel" aria-label={label}>
                {@render children()}
            </div>
        {/snippet}
    </Popup>
{/if}
