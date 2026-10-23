<script lang="ts">
    import type { InternalItemCardProps } from "./ItemCard.svelte";
    import type { MessageFormatter } from "$lib/server/i18n";
    import ItemNameHeader from "./components/ItemNameHeader.svelte";
    import ItemAttributes from "./components/ItemAttributes.svelte";
    import ItemFooter from "./components/ItemFooter.svelte";
    import ItemImage from "./components/ItemImage.svelte";

    const { defaultImage: _defaultImage, ...props }: InternalItemCardProps = $props();
</script>

<div class="m3-item-row">
    <div class="m3-item-media">
        <div class="absolute inset-0">
            <ItemImage class="h-full w-full object-cover" {...props} shrinkBadge>
                {#snippet defaultImage(t: MessageFormatter)}
                    {@render _defaultImage(t, "h-full w-full")}
                {/snippet}
            </ItemImage>
        </div>
    </div>
    <div class="m3-item-content">
        <ItemNameHeader {...props} />
        <div class="min-w-0"><ItemAttributes {...props} /></div>
        <ItemFooter {...props} />
    </div>
</div>
