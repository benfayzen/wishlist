<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import type { InternalItemCardProps } from "./ItemCard.svelte";
    import type { MessageFormatter } from "$lib/server/i18n";
    import ItemNameHeader from "./components/ItemNameHeader.svelte";
    import ItemAttributes from "./components/ItemAttributes.svelte";
    import ItemFooter from "./components/ItemFooter.svelte";
    import ItemImage from "./components/ItemImage.svelte";

    const t = getFormatter();
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
        {#if props.item.mostWanted}
            <span class="m3-mobile-wish-priority text-sm font-semibold">{$t("wishes.most-wanted")}</span>
        {/if}
        <ItemNameHeader {...props} />
        <div class="min-w-0"><ItemAttributes {...props} /></div>
        <ItemFooter {...props} />
    </div>
</div>
