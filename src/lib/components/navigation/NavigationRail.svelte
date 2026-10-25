<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import NavigationDestinations from "./NavigationDestinations.svelte";
    import AppLogo from "./AppLogo.svelte";

    let {
        navItems,
        user,
        expanded = $bindable(false)
    }: { navItems: NavItem[]; user: LocalUser; expanded?: boolean } = $props();
    const t = getFormatter();
</script>

<aside class="m3-navigation-rail print:hidden" class:expanded>
    <div class="m3-rail-brand"><AppLogo /></div>
    <button
        class="m3-icon-button m3-rail-toggle"
        aria-controls="primary-rail-destinations"
        aria-expanded={expanded}
        aria-label={$t(expanded ? "a11y.collapse-navigation" : "a11y.expand-navigation")}
        onclick={() => (expanded = !expanded)}
        type="button"
    >
        <iconify-icon
            aria-hidden="true"
            icon={expanded ? "material-symbols:menu-open-rounded" : "material-symbols:menu-rounded"}
        ></iconify-icon>
    </button>
    <nav id="primary-rail-destinations" aria-label={$t("a11y.main-navigation")}>
        <NavigationDestinations {navItems} {user} />
    </nav>
</aside>
