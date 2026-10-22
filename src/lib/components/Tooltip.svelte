<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import { Popover, Portal } from "@skeletonlabs/skeleton-svelte";
    import type { Snippet } from "svelte";
    import type { ClassValue } from "svelte/elements";

    interface Props {
        label: Snippet;
        description: Snippet;
        icon?: Snippet;
        iconClass?: ClassValue;
    }

    const props: Props = $props();
    const t = getFormatter();
</script>

<div class="flex items-center gap-2">
    {@render props.label()}
    <Popover>
        <Popover.Trigger class="m3-icon-button m3-text-button" aria-label={$t("ui.more-information")} type="button">
            <span class="flex content-center items-center">
                {#if props.icon}
                    {@render props.icon()}
                {:else}
                    <iconify-icon
                        class={["text-secondary-500", props.iconClass]}
                        icon="ion:help-circle-outline"
                    ></iconify-icon>
                {/if}
            </span>
        </Popover.Trigger>
        <Portal>
            <Popover.Positioner>
                <Popover.Content
                    class="m3-card  z-20 w-80 p-4 transition-all transition-discrete data-[state=closed]:scale-90 data-[state=open]:scale-100 starting:data-[state=closed]:scale-100 starting:data-[state=open]:scale-90"
                >
                    <Popover.Description>
                        {@render props.description()}
                    </Popover.Description>
                    <Popover.Arrow
                        style="--arrow-size: calc(var(--spacing) * 2); --arrow-background: var(--color-surface-500);"
                    >
                        <Popover.ArrowTip />
                    </Popover.Arrow>
                </Popover.Content>
            </Popover.Positioner>
        </Portal>
    </Popover>
</div>
