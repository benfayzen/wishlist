<script lang="ts">
    import BaseChip from "./BaseChip.svelte";
    import { getFormatter } from "$lib/i18n";
    let { groups }: { groups: { id: string; name: string }[] } = $props();
    const t = getFormatter();
    const defaultOption = $derived({ value: "", displayValue: $t("general.all") });
    const options = $derived([
        defaultOption,
        ...groups.map((group) => ({ value: group.id, displayValue: group.name }))
    ]);
</script>

<BaseChip
    {defaultOption}
    label={$t("admin.groups")}
    multiselect
    {options}
    prefix="material-symbols:groups-outline-rounded"
    searchParam="groups"
    showLabel
    testId="overview-group-filter"
/>
