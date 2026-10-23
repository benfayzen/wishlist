<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import NavigationDestinations from "./NavigationDestinations.svelte";

    const { navItems, user }: { navItems: NavItem[]; user: LocalUser | null } = $props();
    const t = getFormatter();
</script>

{#if user}
    <nav class="m3-navigation-bar" aria-label={$t("a11y.main-navigation")}>
        <NavigationDestinations {navItems} {user} />
    </nav>
{/if}
