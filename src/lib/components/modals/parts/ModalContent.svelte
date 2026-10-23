<script lang="ts">
    import { Dialog } from "@skeletonlabs/skeleton-svelte";
    import type { Snippet } from "svelte";
    import type { ClassValue } from "svelte/elements";

    interface Props {
        children: Snippet;
        class?: ClassValue;
    }

    const { children, ...props }: Props = $props();
</script>

<Dialog.Content>
    {#snippet element(elProps)}
        <div
            {...elProps}
            class={[
                "m3-dialog space-y-4 transition-opacity transition-discrete data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
                props.class
            ]}
        >
            {@render children()}
        </div>
    {/snippet}
</Dialog.Content>
