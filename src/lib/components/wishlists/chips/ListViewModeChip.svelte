<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import { getListViewPreferenceState } from "$lib/stores/list-view-preference.svelte";
    import ConnectedButtonGroup from "$lib/components/ConnectedButtonGroup.svelte";

    const { isTileView }: { isTileView: boolean } = $props();
    const t = getFormatter();
    const preference = getListViewPreferenceState();
    const options = $derived([
        { value: "list", label: $t("wishes.list-view"), icon: "material-symbols:format-list-bulleted-rounded" },
        {
            value: "tile",
            label: $t("wishes.tile-view"),
            icon: "material-symbols:grid-view-outline-rounded",
            selectedIcon: "material-symbols:grid-view-rounded"
        }
    ]);

    function select(value: string) {
        if (value !== "list" && value !== "tile") return;
        preference.value = value;
        document.cookie = `listViewPreference=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
</script>

<ConnectedButtonGroup
    label={$t("wishes.view-layout")}
    onchange={select}
    {options}
    value={isTileView ? "tile" : "list"}
/>
