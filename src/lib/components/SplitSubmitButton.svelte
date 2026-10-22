<script lang="ts">
    import { Menu, Portal } from "@skeletonlabs/skeleton-svelte";
    import { getFormatter } from "$lib/i18n";
    import { tick } from "svelte";

    const {
        label,
        disabled,
        saving
    }: {
        label: string;
        disabled: boolean;
        saving: boolean;
    } = $props();
    const t = getFormatter();
    let alternate: HTMLButtonElement;
    let open = $state(false);

    async function submitAnother() {
        if (disabled) return;
        // Let the menu finish restoring focus before native validation focuses an invalid field.
        await tick();
        requestAnimationFrame(() => {
            if (!disabled && alternate.isConnected) alternate.form?.requestSubmit(alternate);
        });
    }
</script>

<div class="m3-split-button">
    <button id="submit" class="m3-button m3-primary m3-split-leading" {disabled} type="submit">
        {#if saving}<span class="loading loading-xs" aria-hidden="true"></span>{/if}
        <span>{label}</span>
    </button>
    <Menu
        onOpenChange={(event) => (open = event.open)}
        onSelect={submitAnother}
        {open}
        positioning={{ placement: "top-end" }}
    >
        <Menu.Trigger
            class="m3-icon-button m3-primary m3-split-trailing"
            aria-label={$t("ui.create-options")}
            {disabled}
            type="button"
        >
            <iconify-icon aria-hidden="true" icon="material-symbols:expand-more-rounded"></iconify-icon>
        </Menu.Trigger>
        <Portal>
            <Menu.Positioner class="z-20!">
                <Menu.Content class="m3-action-menu">
                    <Menu.Item {disabled} value="submit-stay">
                        <iconify-icon aria-hidden="true" icon="material-symbols:add-rounded"></iconify-icon>
                        <Menu.ItemText>{$t("wishes.create-and-add-another")}</Menu.ItemText>
                    </Menu.Item>
                </Menu.Content>
            </Menu.Positioner>
        </Portal>
    </Menu>
    <!-- requestSubmit preserves validation and SvelteKit's submitter identity across the portal. -->
    <button bind:this={alternate} id="submit-stay" {disabled} hidden type="submit">
        {$t("wishes.create-and-add-another")}
    </button>
</div>
