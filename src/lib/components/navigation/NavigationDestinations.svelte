<script lang="ts">
    import { page } from "$app/state";
    import { getFormatter } from "$lib/i18n";
    import { activeDestination } from "./navigation";

    const { navItems, user }: { navItems: NavItem[]; user: LocalUser } = $props();
    const t = getFormatter();
    const active = $derived(activeDestination(page.url, user));
</script>

{#each navItems as item (item.labelKey)}
    {@const selected = item.labelKey === active}
    <a
        class="m3-navigation-destination"
        aria-current={selected ? "page" : undefined}
        data-sveltekit-preload-data="hover"
        href={item.href(user)}
        onclick={() => {
            if (selected) document.getElementById("main")?.scrollTo({ top: 0, behavior: "instant" });
        }}
    >
        <span class="m3-navigation-indicator">
            <iconify-icon
                aria-hidden="true"
                icon={selected ? item.icon : item.outlinedIcon || item.icon}
            ></iconify-icon>
        </span>
        <span class="m3-navigation-label">{$t(item.labelKey)}</span>
    </a>
{/each}
