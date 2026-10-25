<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import fuzzysort from "fuzzysort";

    interface Props {
        data: Record<string, unknown>[];
        keys: string[];
        result: Record<string, unknown>[];
    }

    // eslint-disable-next-line no-useless-assignment
    let { data, keys, result = $bindable() }: Props = $props();
    const t = getFormatter();

    let search = $state("");
    let targets = $derived(fuzzysort.snapshot(data, { keys }));

    $effect(() => {
        result = fuzzysort.go(search, targets, { limit: 0 }).map((result) => result.obj);
    });
</script>

<label class="m3-label w-fit">
    <span>{$t("general.search")}</span>
    <div class="m3-field grid-cols-[auto_1fr_auto]">
        <div class="m3-field-slot">
            <iconify-icon class="text-lg" icon="ion:search"></iconify-icon>
        </div>
        <input class="m3-field-input" type="search" bind:value={search} />
    </div>
</label>
