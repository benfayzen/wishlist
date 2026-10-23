<script lang="ts">
    import { dragHandle } from "svelte-dnd-action";
    import { getFormatter } from "$lib/i18n";
    import { getListViewPreference } from "$lib/stores/list-view-preference.svelte";
    import type { InternalItemCardProps } from "./ItemCard.svelte";

    type Props = Pick<InternalItemCardProps, "item" | "onIncreasePriority" | "onDecreasePriority" | "onPriorityChange">;

    const { item, onIncreasePriority, onDecreasePriority, onPriorityChange }: Props = $props();
    const t = getFormatter();

    let messageObj = $derived({ values: { name: item.name } });

    let isTileView = $derived(getListViewPreference() === "tile");
    let displayOrder = $derived(item.displayOrder !== null ? item.displayOrder + 1 : null);
</script>

<div class="flex flex-col">
    <div
        class={[
            "m3-reorder-actions flex min-w-0 flex-wrap items-center justify-center gap-2",
            isTileView && "md:flex-row-reverse"
        ]}
    >
        <button
            class="m3-button m3-icon-button m3-outlined"
            aria-label={$t("a11y.decrease-priority", messageObj)}
            onclick={(e) => {
                e.stopPropagation();
                if (onDecreasePriority) onDecreasePriority(item.id);
            }}
            title={$t("a11y.decrease-priority", messageObj)}
        >
            <iconify-icon class={[isTileView && "md:-rotate-90"]} icon="ion:arrow-down"></iconify-icon>
        </button>
        <div>
            <label class="sr-only" for={item.id + "-displayOrder"}>{$t("wishes.display-order")}</label>
            <input
                id={item.id + "-displayOrder"}
                class="m3-input w-16 text-center text-sm md:text-base"
                inputmode="numeric"
                onchange={(e) => onPriorityChange?.(item, e.currentTarget.value)}
                pattern="[0-9]*"
                value={displayOrder}
            />
        </div>
        <button
            class="m3-button m3-icon-button m3-outlined"
            aria-label={$t("a11y.increase-priority", messageObj)}
            onclick={(e) => {
                e.stopPropagation();
                if (onIncreasePriority) onIncreasePriority(item.id);
            }}
            title={$t("a11y.increase-priority", messageObj)}
        >
            <iconify-icon class={[isTileView && "md:-rotate-90"]} icon="ion:arrow-up"></iconify-icon>
        </button>
    </div>

    <button
        class="m3-button m3-button-small w-full"
        aria-label={$t("a11y.drag-handle", messageObj)}
        onclick={(e) => e.stopPropagation()}
        title={$t("a11y.drag-handle", messageObj)}
        use:dragHandle
    >
        <iconify-icon icon="ion:reorder-two"></iconify-icon>
    </button>
</div>
