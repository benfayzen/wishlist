<script lang="ts">
    import type { ItemOnListDTO } from "$lib/dtos/item-dto";
    import { getFormatter } from "$lib/i18n";
    import { formatNumberAsPrice } from "$lib/price-formatter";

    interface Props {
        items: ItemOnListDTO[];
    }

    const { items }: Props = $props();
    const t = getFormatter();

    const itemCount = $derived(items.reduce((accum, item) => accum + (item.quantity || 1), 0));
    const totalCostByCurrency = $derived.by(() => {
        const totalCostByCurrency = items
            .filter((i) => i.itemPrice !== null)
            .reduce(
                (accum, item) => {
                    accum[item.itemPrice!.currency] =
                        (accum[item.itemPrice!.currency] ||= 0) + item.itemPrice!.value * (item.quantity || 1);
                    return accum;
                },
                {} as Record<string, number>
            );
        return Object.entries(totalCostByCurrency)
            .map(([currency, total]) => ({ currency, total }))
            .toSorted((a, b) => b.total - a.total);
    });
    const highestTotal = $derived(totalCostByCurrency[0]);

    let seePrices = $state(false);
</script>

<div>
    <div class="flex flex-row items-baseline gap-1">
        <span>{$t("wishes.count-items", { values: { itemCount } })}</span>
        {#if totalCostByCurrency.length > 0}
            <span>·</span>
            <span>{formatNumberAsPrice(highestTotal.currency, highestTotal.total)}</span>
            {#if totalCostByCurrency.length > 1 && !seePrices}
                <button
                    class="m3-button m3-text-button m3-button-small"
                    aria-expanded={seePrices}
                    onclick={() => (seePrices = !seePrices)}
                >
                    <span class="text-subtle text-xs">
                        {$t("wishes.show-all-currencies")}
                    </span>
                </button>
            {/if}
        {/if}
    </div>
    {#if seePrices}
        <div class="flex flex-col gap-1 pt-1">
            <ul class="list">
                {#each totalCostByCurrency as { currency, total }}
                    <li>
                        <span class="m3-currency-badge">
                            {currency}
                        </span>
                        <span>{formatNumberAsPrice(currency, total)}</span>
                    </li>
                {/each}
            </ul>
            <button
                class="m3-button m3-text-button m3-button-small w-fit"
                aria-expanded={seePrices}
                onclick={() => (seePrices = !seePrices)}
            >
                <span class="text-subtle text-xs">
                    {$t("wishes.hide-all-currencies")}
                </span>
            </button>
        </div>
    {/if}
</div>
