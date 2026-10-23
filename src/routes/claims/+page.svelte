<script lang="ts">
    import { fade, scale, motionDuration } from "$lib/motion";
    import { flip } from "svelte/animate";
    import type { PageProps } from "./$types";
    import ItemCard from "$lib/components/wishlists/ItemCard/ItemCard.svelte";
    import noClaims from "$lib/assets/no_claims.svg";
    import type { ItemOnListDTO } from "$lib/dtos/item-dto";
    import { getFormatter } from "$lib/i18n";
    import { getListViewPreference, initListViewPreference } from "$lib/stores/list-view-preference.svelte";
    import ListViewModeChip from "$lib/components/wishlists/chips/ListViewModeChip.svelte";
    import ListFilterChip from "$lib/components/wishlists/chips/ListFilterChip.svelte";
    import ClaimsGroupBy from "$lib/components/wishlists/chips/ClaimsGroupBy.svelte";

    const { data }: PageProps = $props();
    const t = getFormatter();

    let items: ItemOnListDTO[] = $state(data.items);

    $effect(() => {
        items = data.items;
    });

    // Initialize from server data (cookie) to prevent flicker
    // This value comes from the server, so SSR renders the correct view
    // svelte-ignore state_referenced_locally
    initListViewPreference(data.initialViewPreference);
    let isTileView = $derived(getListViewPreference() === "tile");

    let groupBy = $state("purchased");

    let groupedItems = $derived.by(() => {
        let groupedItems: Record<string, ItemOnListDTO[]> = { _default: items };
        if (groupBy === "purchased") {
            groupedItems = Object.groupBy(items, (it) => (it.claims[0].purchased ? "Purchased" : "_default"));
        } else if (groupBy === "user") {
            groupedItems = items.reduce(
                (accum, item) => {
                    (accum[item.user.name] ??= []).push(item);
                    return accum;
                },
                {} as Record<string, ItemOnListDTO[]>
            );
        }
        return Object.entries(groupedItems).toSorted(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB));
    });

    const isPurchased = (item: ItemOnListDTO) => {
        return item.claims[0].purchased ? 1 : 0;
    };

    let users = $derived(items.map((item) => item.user));
</script>

<div class="claims-toolbar print:hidden">
    <div class="claims-filter m3-mode-control">
        <span class="m3-mode-label">{$t("wishes.filter")}</span>
        <ListFilterChip {users} />
    </div>
    <div class="claims-grouping">
        <ClaimsGroupBy bind:groupBy />
    </div>
    <div class="claims-view m3-mode-control">
        <span class="m3-mode-label">{$t("wishes.view-layout")}</span>
        <ListViewModeChip {isTileView} />
    </div>
</div>

{#if data.items.length === 0}
    <div class="flex flex-col items-center justify-center space-y-4 pt-4">
        <img class="w-3/4 md:w-1/3" alt={$t("a11y.a-person-looking-at-an-empty-board")} src={noClaims} />
        <p class="text-2xl">{$t("wishes.nothing-claimed-yet")}</p>
    </div>
{:else}
    <div class="flex flex-col space-y-4" data-testid="claims-container">
        {#each groupedItems as [category, items] (category)}
            {@const sortedItems =
                groupBy !== "purchased" ? items.toSorted((a, b) => isPurchased(a) - isPurchased(b)) : items}
            {#if category !== "_default"}
                <span transition:fade>{category}</span>
            {/if}
            <div
                class={[
                    isTileView
                        ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                        : "flex flex-col space-y-4"
                ]}
                data-testid="category"
                transition:scale
            >
                {#each sortedItems as item (item.id)}
                    <div transition:fade animate:flip={{ duration: motionDuration(200) }}>
                        <ItemCard
                            groupId={data.user.activeGroupId}
                            {isTileView}
                            {item}
                            requireClaimEmail
                            showClaimForOwner={data.config.claims.showForOwner}
                            showClaimedName
                            showFor
                            user={data.user}
                        />
                    </div>
                {/each}
            </div>
        {/each}
    </div>
{/if}

<svelte:head>
    <title>{$t("app.my-claims")}</title>
</svelte:head>

<style>
    /* Product layout: give each control its own space and keep grouping together. */
    .claims-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 1.5rem 2rem;
        padding-block-end: 1.75rem;
    }
    .claims-toolbar :global(.m3-mode-control) {
        gap: 0.5rem;
    }
    .claims-filter {
        min-inline-size: 0;
        max-inline-size: 100%;
    }
    .claims-grouping {
        min-inline-size: 0;
        max-inline-size: 100%;
    }
    .claims-grouping :global(.m3-connected-group) {
        inline-size: 100%;
    }
    .claims-grouping :global(.m3-connected-button-surface) {
        padding-inline: 1.25rem;
    }
    .claims-view {
        margin-inline-start: auto;
    }
    @media (max-width: 599px) {
        .claims-toolbar {
            column-gap: 0.5rem;
        }
        .claims-filter {
            flex: 1;
        }
        .claims-grouping {
            order: 1;
            flex-basis: 100%;
        }
    }
    @media print {
        .claims-toolbar {
            display: none;
        }
    }
</style>
