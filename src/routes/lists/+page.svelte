<script lang="ts">
    import type { PageData, PageProps } from "./$types";
    import { fade } from "$lib/motion";
    import { hash, hashItems, viewedItems } from "$lib/stores/viewed-items";
    import ListCard from "$lib/components/ListCard.svelte";
    import { goto } from "$app/navigation";
    import ListFilterChip from "$lib/components/wishlists/chips/ListFilterChip.svelte";
    import empty from "$lib/assets/no_wishes.svg";
    import { getFormatter } from "$lib/i18n";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { isMyListsView } from "$lib/components/navigation/navigation";
    import OverviewGroupFilterChip from "$lib/components/wishlists/chips/OverviewGroupFilterChip.svelte";

    type ListData = PageData["otherLists"][0];

    let { data }: PageProps = $props();

    const t = getFormatter();
    const users = $derived(data.users);
    const myListsView = $derived(isMyListsView(page.url, data.user));

    const hasNewItems = async (list: ListData) => {
        if (!list.items || list.items.length === 0) return false;
        const userHash = await hash(list.id);
        const currentHash = await hashItems(list.items);
        const viewedHash = viewedItems.current[userHash];
        return currentHash !== viewedHash;
    };
</script>

{#if !myListsView}
    <div class="m3-toolbar justify-start! print:hidden">
        <OverviewGroupFilterChip groups={data.groups ?? []} />
        <ListFilterChip {users} />
    </div>
{/if}

{#if data.myLists.length + data.otherLists.length === 0}
    <div class="flex flex-col items-center justify-center space-y-4 pt-4">
        <img class="w-3/4 md:w-1/3" alt={$t("a11y.two-people-looking-in-an-empty-box")} src={empty} />
        <p class="text-2xl">{$t("wishes.no-lists-yet")}</p>
    </div>
{:else}
    <div class="m3-list-grid" data-testid="list-container" in:fade>
        {#each data.myLists as list (list.id)}
            <ListCard hideCount {list} />
        {/each}

        {#each data.otherLists as list (list.id)}
            {#await hasNewItems(list)}
                <ListCard {list} />
            {:then hasNewItems}
                <ListCard {hasNewItems} {list} />
            {/await}
        {/each}
    </div>
{/if}

<footer class="print:hidden">
    <div class="h-16"></div>
</footer>

<button
    class="m3-fab m3-page-fab print:hidden"
    aria-label={$t("wishes.create-list")}
    onclick={() => goto(resolve("/lists/create"))}
    title={$t("wishes.create-list")}
>
    <iconify-icon aria-hidden="true" icon="material-symbols:add-rounded"></iconify-icon>
    <span class="m3-fab-label">{$t("wishes.create-list")}</span>
</button>

<svelte:head>
    <title>{$t(myListsView ? "wishes.my-lists" : "navigation.overview")}</title>
</svelte:head>
