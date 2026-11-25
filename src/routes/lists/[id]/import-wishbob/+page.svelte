<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import type { PageProps } from "./$types";
    import type { WishbobPreviewItem } from "./+page.server";
    import ClearableInput from "$lib/components/ClearableInput.svelte";
    import Checkbox from "$lib/components/Checkbox.svelte";
    import FormSection from "$lib/components/FormSection.svelte";
    import { formatNumberAsPrice } from "$lib/price-formatter";
    import { getFormatter } from "$lib/i18n";
    import { toaster } from "$lib/components/toaster";

    const { data, form }: PageProps = $props();
    const t = getFormatter();

    let urlInput = $state("");
    let fetchingPreview = $state(false);
    let importing = $state(false);

    let preview = $state<{
        sourceUrl: string;
        listTitle: string | null;
        items: WishbobPreviewItem[];
    } | null>(null);

    let ignoreFulfilled = $state(true);
    let selectedIds = $state<Record<string, boolean>>({});

    $effect(() => {
        if (form?.url && !urlInput) {
            urlInput = form.url;
        }
        if (form?.preview) {
            preview = form.preview;
            const initialSelection: Record<string, boolean> = {};
            for (const item of form.preview.items) {
                initialSelection[item.externalId] = !item.fulfilled && !item.alreadyInList;
            }
            selectedIds = initialSelection;
        }
        if (form?.error) {
            toaster.error({ description: form.error });
        }
        if (form?.importError) {
            toaster.error({ description: form.importError });
        }
    });

    const visibleItems = $derived(preview ? preview.items.filter((item) => !(ignoreFulfilled && item.fulfilled)) : []);

    const fulfilledCount = $derived(preview ? preview.items.filter((item) => item.fulfilled).length : 0);

    const selectedItems = $derived(visibleItems.filter((item) => Boolean(selectedIds[item.externalId])));

    const serializedSelectedItems = $derived(
        JSON.stringify(
            selectedItems.map((item) => ({
                name: item.name,
                url: item.url,
                note: item.note,
                imageUrl: item.imageUrl,
                price: item.price ? { value: item.price.value, currency: item.price.currency } : null,
                mostWanted: item.mostWanted
            }))
        )
    );

    const selectAllVisible = () => {
        const next = { ...selectedIds };
        for (const item of visibleItems) {
            next[item.externalId] = true;
        }
        selectedIds = next;
    };

    const deselectAllVisible = () => {
        const next = { ...selectedIds };
        for (const item of visibleItems) {
            next[item.externalId] = false;
        }
        selectedIds = next;
    };

    const getDomain = (rawUrl: string | null) => {
        if (!rawUrl) return null;
        try {
            return new URL(rawUrl).hostname.replace(/^www\./, "");
        } catch {
            return null;
        }
    };

    const listDisplayName = $derived(
        data.list.name ||
            (data.list.owner.isMe
                ? $t("wishes.my-wishes")
                : $t("wishes.wishes-for", { values: { listOwner: data.list.owner.name } }))
    );
</script>

<div class="flex flex-col gap-5">
    <div class="m3-form-surface">
        <FormSection title={$t("wishes.wishbob-import-title")}>
            <p class="subtext">
                {$t("wishes.wishbob-import-description", { values: { listName: listDisplayName } })}
            </p>

            <form
                class="flex flex-col gap-4"
                action="?/preview"
                method="POST"
                use:enhance={() => {
                    fetchingPreview = true;
                    return async ({ update }) => {
                        fetchingPreview = false;
                        await update({ reset: false });
                    };
                }}
            >
                <label class="m3-label" for="wishbob-url">
                    <span>{$t("wishes.wishbob-url-label")}</span>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <div class="min-w-0 flex-1">
                            <ClearableInput
                                id="wishbob-url"
                                name="url"
                                class="m3-input"
                                autocomplete="url"
                                clearButtonLabel={$t("a11y.clear-url-field")}
                                disabled={fetchingPreview || importing}
                                onValueClear={() => (urlInput = "")}
                                placeholder="https://www.wishbob.com/..."
                                required
                                showClearButton={() => Boolean(urlInput)}
                                type="url"
                                bind:value={urlInput}
                            />
                        </div>
                        <button
                            class="m3-primary m3-button shrink-0"
                            disabled={fetchingPreview || importing || !urlInput.trim()}
                            type="submit"
                        >
                            {#if fetchingPreview}
                                <iconify-icon aria-hidden="true" icon="svg-spinners:90-ring-with-bg"></iconify-icon>
                                <span>{$t("wishes.wishbob-loading-preview")}</span>
                            {:else}
                                <iconify-icon aria-hidden="true" icon="material-symbols:search-rounded"></iconify-icon>
                                <span>{$t("wishes.wishbob-load-preview")}</span>
                            {/if}
                        </button>
                    </div>
                </label>

                {#if form?.error}
                    <p class="text-invalid text-sm" role="alert">{form.error}</p>
                {/if}
            </form>
        </FormSection>
    </div>

    {#if preview}
        <div class="m3-form-surface">
            <FormSection title={preview.listTitle || $t("wishes.wishbob-preview-title")}>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex flex-wrap items-center gap-3">
                        <Checkbox disabled={importing} bind:checked={ignoreFulfilled}>
                            {$t("wishes.wishbob-ignore-fulfilled", { values: { count: fulfilledCount } })}
                        </Checkbox>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="subtext text-sm">
                            {$t("wishes.wishbob-selected-count", {
                                values: { selected: selectedItems.length, total: visibleItems.length }
                            })}
                        </span>
                        <button
                            class="m3-secondary m3-button m3-button-small"
                            disabled={importing || visibleItems.length === 0}
                            onclick={selectAllVisible}
                            type="button"
                        >
                            {$t("wishes.wishbob-select-all")}
                        </button>
                        <button
                            class="m3-text-button m3-button m3-button-small"
                            disabled={importing || selectedItems.length === 0}
                            onclick={deselectAllVisible}
                            type="button"
                        >
                            {$t("wishes.wishbob-deselect-all")}
                        </button>
                    </div>
                </div>

                {#if visibleItems.length === 0}
                    <p class="subtext py-4 text-center">{$t("wishes.wishbob-no-visible-items")}</p>
                {:else}
                    <div class="flex flex-col gap-3" data-testid="wishbob-preview-list">
                        {#each visibleItems as item (item.externalId)}
                            {@const domain = getDomain(item.url)}
                            <div
                                class={[
                                    "m3-card flex items-start gap-3 p-3 transition-opacity",
                                    !selectedIds[item.externalId] && "opacity-65"
                                ]}
                            >
                                <div class="pt-1">
                                    <Checkbox
                                        aria-label={item.name}
                                        disabled={importing}
                                        bind:checked={selectedIds[item.externalId]}
                                    />
                                </div>

                                <div
                                    class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-white/5"
                                >
                                    {#if item.imageUrl}
                                        <img
                                            class="h-full w-full object-contain"
                                            alt={item.name}
                                            loading="lazy"
                                            referrerpolicy="no-referrer"
                                            src={item.imageUrl}
                                        />
                                    {:else}
                                        <iconify-icon
                                            class="text-2xl opacity-50"
                                            aria-hidden="true"
                                            icon="material-symbols:featured-seasonal-and-gifts-rounded"
                                        ></iconify-icon>
                                    {/if}
                                </div>

                                <div class="flex min-w-0 flex-1 flex-col gap-1">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="font-medium break-words">{item.name}</span>
                                        {#if item.fulfilled}
                                            <span
                                                class="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                                            >
                                                {$t("wishes.wishbob-fulfilled-badge")}
                                            </span>
                                        {/if}
                                        {#if item.alreadyInList}
                                            <span
                                                class="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                                            >
                                                {$t("wishes.wishbob-already-in-list")}
                                            </span>
                                        {/if}
                                    </div>

                                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                        {#if item.price}
                                            <span class="font-semibold">
                                                {formatNumberAsPrice(item.price.currency, item.price.value)}
                                            </span>
                                        {/if}
                                        {#if item.url && domain}
                                            <a
                                                class="subtext inline-flex items-center gap-1 underline-offset-2 hover:underline"
                                                href={item.url}
                                                rel="noopener noreferrer"
                                                target="_blank"
                                            >
                                                <span>{domain}</span>
                                                <iconify-icon
                                                    class="text-xs"
                                                    aria-hidden="true"
                                                    icon="material-symbols:open-in-new-rounded"
                                                ></iconify-icon>
                                            </a>
                                        {/if}
                                    </div>

                                    {#if item.note}
                                        <p class="subtext line-clamp-2 text-sm whitespace-pre-line">{item.note}</p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </FormSection>
        </div>

        <form
            action="?/import"
            method="POST"
            use:enhance={() => {
                importing = true;
                return async ({ update }) => {
                    importing = false;
                    await update();
                };
            }}
        >
            <input name="items" type="hidden" value={serializedSelectedItems} />
            <div class="m3-form-actions m3-form-surface">
                <button
                    class="m3-secondary m3-button"
                    disabled={importing}
                    onclick={() => goto(`/lists/${data.list.id}`)}
                    type="button"
                >
                    {$t("general.cancel")}
                </button>
                <button class="m3-primary m3-button" disabled={importing || selectedItems.length === 0} type="submit">
                    {#if importing}
                        <iconify-icon aria-hidden="true" icon="svg-spinners:90-ring-with-bg"></iconify-icon>
                        <span>{$t("wishes.wishbob-importing")}</span>
                    {:else}
                        <iconify-icon aria-hidden="true" icon="material-symbols:download-rounded"></iconify-icon>
                        <span>
                            {$t("wishes.wishbob-import-selected", { values: { count: selectedItems.length } })}
                        </span>
                    {/if}
                </button>
            </div>
        </form>
    {:else}
        <div class="m3-form-actions m3-form-surface">
            <button
                class="m3-secondary m3-button"
                disabled={fetchingPreview}
                onclick={() => goto(`/lists/${data.list.id}`)}
                type="button"
            >
                {$t("general.cancel")}
            </button>
        </div>
    {/if}
</div>

<svelte:head>
    <title>{$t("wishes.wishbob-import-title")}</title>
</svelte:head>
