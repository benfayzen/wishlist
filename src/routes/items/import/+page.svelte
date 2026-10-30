<script lang="ts">
    import Select from "$lib/components/Select.svelte";
    import { enhance } from "$app/forms";
    import { getFormatter } from "$lib/i18n";
    import type { PageProps } from "./$types";

    const props: PageProps = $props();
    const t = getFormatter();

    let data = $derived(props.data);
    let form = $derived(props.form);

    let lists = $derived(data.lists);
</script>

<div class="flex w-full flex-col items-center">
    <form class="m3-card flex w-full max-w-xl flex-col gap-4 p-4" method="POST" use:enhance>
        {#if !data.url}
            <div class="flex flex-col gap-2">
                <h2 class="m3-headline">{$t("wishes.import-error-title")}</h2>
                <span>{$t("wishes.import-error-text")}</span>
            </div>
        {:else}
            <div>
                <h2 class="m3-headline">{$t("wishes.import-item")}</h2>
                <span>{$t("wishes.import-item-text")}</span>
            </div>

            <div class="flex flex-col gap-2">
                <label class="m3-label w-full">
                    <span>{$t("wishes.select-a-list")}</span>

                    <Select name="list" class="m3-select" disabled={lists.length === 0} required>
                        {#if lists.length === 0}
                            <option value={undefined}>{$t("general.no-lists-available")}</option>
                        {/if}
                        {#each lists as list}
                            {@const listName =
                                list.name || $t("wishes.wishes-for", { values: { listOwner: list.owner.name } })}
                            <option value={list.id}>{listName}</option>
                        {/each}
                    </Select>

                    {#if form?.list}
                        <span class="text-invalid">{form.list}</span>
                    {/if}
                </label>

                <input name="url" class="hidden" value={data.url} />
            </div>

            <div class="flex flex-row-reverse">
                <button class="m3-primary m3-button">{$t("general.import")}</button>
            </div>
        {/if}
    </form>
</div>
