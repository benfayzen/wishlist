<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import ConnectedButtonGroup from "$lib/components/ConnectedButtonGroup.svelte";
    let { groupBy = $bindable() }: { groupBy: string } = $props();
    const t = getFormatter();
    const options = $derived([
        {
            value: "purchased",
            label: $t("wishes.purchased"),
            icon: "material-symbols:shopping-bag-outline-rounded",
            selectedIcon: "material-symbols:shopping-bag-rounded"
        },
        {
            value: "user",
            label: $t("general.user"),
            icon: "material-symbols:person-outline-rounded",
            selectedIcon: "material-symbols:person-rounded"
        }
    ]);
</script>

<div class="m3-mode-control">
    <span class="m3-mode-label">{$t("wishes.group-by")}</span>
    <ConnectedButtonGroup
        label={$t("wishes.group-by")}
        onchange={(value) => (groupBy = value)}
        {options}
        showLabels
        value={groupBy}
    />
</div>
