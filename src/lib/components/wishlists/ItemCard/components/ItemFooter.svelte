<script lang="ts">
    import ClaimButtons from "../ClaimButtons.svelte";
    import type { InternalItemCardProps } from "../ItemCard.svelte";
    import ManageButtons from "../ManageButtons.svelte";
    import ReorderButtons from "../ReorderButtons.svelte";

    interface Props extends Omit<InternalItemCardProps, "id" | "defaultImage"> {
        onEdit?: VoidFunction;
        noPadding?: boolean;
    }

    const props: Props = $props();
</script>

<footer
    class={[
        "flex items-center gap-2 print:hidden",
        props.noPadding ? "px-0" : "px-4",
        props.reorderActions ? "justify-center pb-0" : "flex-wrap justify-between pb-4"
    ]}
>
    {#if props.reorderActions}
        <ReorderButtons {...props} />
    {:else}
        <ClaimButtons {...props} />
        <ManageButtons {...props} />
    {/if}
</footer>
