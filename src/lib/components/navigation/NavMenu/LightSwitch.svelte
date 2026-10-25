<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import { LocalStorage } from "$lib/local-storage.svelte";
    import ConnectedButtonGroup from "$lib/components/ConnectedButtonGroup.svelte";
    import { onMount } from "svelte";

    const { showLabel = true }: { showLabel?: boolean } = $props();
    const t = getFormatter();
    const options = $derived([
        {
            value: "system",
            label: $t("general.system"),
            icon: "material-symbols:desktop-windows-outline-rounded",
            selectedIcon: "material-symbols:desktop-windows-rounded"
        },
        {
            value: "light",
            label: $t("general.light"),
            icon: "material-symbols:light-mode-outline-rounded",
            selectedIcon: "material-symbols:light-mode-rounded"
        },
        {
            value: "dark",
            label: $t("general.dark"),
            icon: "material-symbols:dark-mode-outline-rounded",
            selectedIcon: "material-symbols:dark-mode-rounded"
        }
    ]);
    const preference = new LocalStorage<string>("mode", "system");
    const value = $derived(["light", "dark"].includes(preference.current) ? preference.current : "system");

    function applyMode() {
        document.documentElement.dataset.mode =
            value === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
    }

    $effect(applyMode);
    onMount(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", applyMode);
        return () => media.removeEventListener("change", applyMode);
    });
</script>

<div class="m3-mode-control">
    <span class={["m3-mode-label", !showLabel && "sr-only"]}>{$t("general.mode")}</span>
    <ConnectedButtonGroup
        label={$t("general.mode")}
        onchange={(mode) => (preference.current = mode)}
        {options}
        {value}
    />
</div>
